import TelegramBot from "node-telegram-bot-api";
import { Api, TelegramClient } from "telegram";
import { getFileObject } from "../message/getters";
import { extractMediaId } from "./convertBotFileToMessageMedia";
import { TotalList } from "telegram/Helpers";
import { _1h, _1sec, _2h, _2sec } from "src/utils/logUtils";

const cantFindTheMessage = "Can't find the message for connected user.";

interface MessageCouple {
	date: number;
	creationTime: Date;
	botMsgId: number;
	clientMsg: Api.Message;
}

interface MessagesRequests {
	botChatId: number;
	msgDate: number;
	limit: number;
	messages: TotalList<Api.Message>;
}

interface UserCouple {
	clientUserId: number;
	botUserId: number;
	botChatId: number;
	clientChat: Api.TypeInputPeer;
}

let cachedMessageCouples: MessageCouple[] = [];
let cachedMessagesRequests: MessagesRequests[] = [];
const cachedUserCouples: UserCouple[] = [];

// clean every 2 hours message request and couples if needed
setInterval(() => {
	if (cachedMessageCouples.length < 5000) return;
	const lastMessageCouple = cachedMessageCouples.last();
	if (lastMessageCouple && new Date().getTime() - lastMessageCouple.creationTime.getTime() > _1h) {
		cachedMessagesRequests = [];
		cachedMessageCouples = [];
	}
}, _2h);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMediaId(media: any): bigint | undefined {
	if (!media) return undefined;
	try {
		return media.document.id;
	} catch {
		try {
			return media.photo.id;
		} catch {
			return undefined;
		}
	}
}

export async function getInputPeer(
	client: TelegramClient,
	clientUser: Api.User,
	botUser: TelegramBot.User,
	botMsg: TelegramBot.Message,
	limit = 10
): Promise<Api.TypeInputPeer> {
	let userCouple = cachedUserCouples.find(
		(usrCouple) =>
			usrCouple.botChatId == botMsg.chat.id &&
			usrCouple.botUserId == botUser.id &&
			usrCouple.clientUserId == clientUser.id.toJSNumber()
	);
	if (userCouple) return userCouple.clientChat;

	const chatId = botMsg.chat.id == clientUser.id.toJSNumber() ? botUser.id : botMsg.chat.id;
	const dialogs = await client.getDialogs({ limit });
	const dialog = dialogs.find((d) => d.id?.toJSNumber() == chatId);
	if (!dialog && limit <= 20) return await getInputPeer(client, clientUser, botUser, botMsg, limit + 10);
	else if (!dialog || !dialog.inputEntity) {
		console.log(dialogs);
		throw new Error(
			`User ${clientUser.username || clientUser.firstName || clientUser.id} does not have chat with ${
				botMsg.chat.username || botMsg.chat.title || botMsg.chat.first_name || botMsg.chat.id
			} `
		);
	}
	userCouple = {
		botChatId: botMsg.chat.id,
		botUserId: botUser.id,
		clientUserId: clientUser.id.toJSNumber(),
		clientChat: dialog.inputEntity,
	};
	cachedUserCouples.push(userCouple);
	return dialog.inputEntity;
}

export async function getMessage(
	client: TelegramClient,
	inputPeer: Api.TypeInputPeer,
	botMsg: TelegramBot.Message,
	mediaId?: string,
	limit = 50
): Promise<Api.Message> {
	let messageCouple = cachedMessageCouples.find((msgCouple) => msgCouple.botMsgId == botMsg.message_id);
	if (messageCouple?.clientMsg) return messageCouple.clientMsg;

	const messagesRequests = cachedMessagesRequests.filter(
		(rq) =>
			rq.botChatId == botMsg.chat.id &&
			rq.msgDate <= botMsg.date &&
			(rq.messages.last()?.date || botMsg.date - 1) >= botMsg.date
	);
	if (!messagesRequests.find((rq) => rq.limit == limit)) {
		// wait 1 sec for history updates in Telegram
		if (new Date().getTime() - new Date(botMsg.date * 1000).getTime() < _1sec)
			await new Promise((resolve) => setTimeout(resolve, _2sec));
		let messages = await client.getMessages(inputPeer, { limit, reverse: true, offsetDate: botMsg.date - 2 });
		// remove bot messages (fromId != undefined)
		messages = messages.filter((m) => m.fromId) || [];
		messagesRequests.push({ botChatId: botMsg.chat.id, msgDate: botMsg.date, messages, limit });
		cachedMessagesRequests.push(messagesRequests[0]);
	}

	if (!botMsg.text && !mediaId) {
		const { fileObject } = getFileObject(botMsg);
		const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
		mediaId = extractMediaId(fileObjectToUse.file_id);
	}
	const skipMsgIds = cachedMessageCouples
		.filter(
			(msgCouple) =>
				(msgCouple.date == botMsg.date || msgCouple.date + 1 == botMsg.date) &&
				msgCouple.botMsgId != botMsg.message_id
		)
		.map((msgCouple) => msgCouple.clientMsg && msgCouple.clientMsg.id);

	const messages = messagesRequests.map((rq) => rq.messages).reduce((accumulator, msgs) => accumulator.concat(msgs));
	const unprocessedMessages = messages.filter((msg) => !skipMsgIds.contains(msg.id));
	const clientMsg = unprocessedMessages.find(
		(m) =>
			(m.date == botMsg.date || m.date + 1 /*different rounding for some reason*/ == botMsg.date) &&
			(m.message || "") == (botMsg.text || botMsg.caption || "") &&
			((mediaId && m.media && mediaId == getMediaId(m.media)?.toString()) || !(mediaId && m.media))
	);
	if (!clientMsg && limit < 200 && messages.length > 0 && botMsg.date >= (messages.last()?.date || botMsg.date + 1))
		return await getMessage(client, inputPeer, botMsg, mediaId, limit + 150);
	else if (!clientMsg) {
		console.log(`${cantFindTheMessage}\n\n botMsg=\n${botMsg}\n\nmessagesRequest=\n${messagesRequests}`);
		throw new Error(cantFindTheMessage);
	}
	if (cachedMessageCouples.find((mc) => mc.clientMsg.id == clientMsg.id)) {
		throw new Error(
			"Because there may be several identical messages, it is not possible to pinpoint which message is needed."
		);
	}
	messageCouple = {
		date: botMsg.date,
		creationTime: new Date(),
		botMsgId: botMsg.message_id,
		clientMsg: clientMsg,
	};
	cachedMessageCouples.push(messageCouple);
	return clientMsg;
}
