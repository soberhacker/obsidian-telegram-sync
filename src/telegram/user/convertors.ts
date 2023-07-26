import TelegramBot from "node-telegram-bot-api";
import { Api, TelegramClient } from "telegram";
import { getFileObject } from "../bot/message/getters";
import { extractMediaId } from "./convertBotFileToMessageMedia";
import { TotalList } from "telegram/Helpers";
import { _1h, _1sec, _2h, _2sec } from "src/utils/logUtils";

const cantFindTheMessage = "Can't find the message for connected user.";

interface MessageCouple {
	date: number;
	creationTime: Date;
	botMsgId: number;
	userMsg: Api.Message;
}

interface MessagesRequests {
	botChatId: number;
	msgDate: number;
	limit: number;
	messages: TotalList<Api.Message>;
}

interface UserCouple {
	userId: number;
	botUserId: number;
	botChatId: number;
	userChat: Api.TypeInputPeer;
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
	if (media.document && media.document.id) return media.document.id;
	if (media.photo && media.photo.id) return media.photo.id;
	return undefined;
}

export async function getInputPeer(
	client: TelegramClient,
	user: Api.User,
	botUser: TelegramBot.User,
	botMsg: TelegramBot.Message,
	limit = 10
): Promise<Api.TypeInputPeer> {
	let userCouple = cachedUserCouples.find(
		(usrCouple) =>
			usrCouple.botChatId == botMsg.chat.id &&
			usrCouple.botUserId == botUser.id &&
			usrCouple.userId == user.id.toJSNumber()
	);
	if (userCouple) return userCouple.userChat;

	const chatId = botMsg.chat.id == user.id.toJSNumber() ? botUser.id : botMsg.chat.id;
	const dialogs = await client.getDialogs({ limit });
	const dialog = dialogs.find((d) => d.id?.toJSNumber() == chatId);
	if (!dialog && limit <= 20) return await getInputPeer(client, user, botUser, botMsg, limit + 10);
	else if (!dialog || !dialog.inputEntity) {
		console.log(dialogs);
		throw new Error(
			`User ${user.username || user.firstName || user.id} does not have chat with ${
				botMsg.chat.username || botMsg.chat.title || botMsg.chat.first_name || botMsg.chat.id
			} `
		);
	}
	userCouple = {
		botChatId: botMsg.chat.id,
		botUserId: botUser.id,
		userId: user.id.toJSNumber(),
		userChat: dialog.inputEntity,
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
	if (messageCouple?.userMsg) return messageCouple.userMsg;

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
				(msgCouple.date - 1 == botMsg.date ||
					msgCouple.date == botMsg.date ||
					msgCouple.date + 1 == botMsg.date) &&
				msgCouple.botMsgId != botMsg.message_id
		)
		.map((msgCouple) => msgCouple.userMsg && msgCouple.userMsg.id);

	const messages = messagesRequests.map((rq) => rq.messages).reduce((accumulator, msgs) => accumulator.concat(msgs));
	const unprocessedMessages = messages.filter((msg) => !skipMsgIds.contains(msg.id));
	const userMsg = unprocessedMessages.find((m) => {
		// different rounding between bot api and user api for unknown reason
		const equalDates = m.date - 1 == botMsg.date || m.date == botMsg.date || m.date + 1 == botMsg.date;
		if (!equalDates) return false;
		//if msg was edited then it's enough only equal dates
		if (m.editDate) return true;
		const equalTexts = (m.message || "") == (botMsg.text || botMsg.caption || "");
		if (!equalTexts) return false;
		const equalGroup = (m.groupedId?.toJSNumber() || 0) == (botMsg.media_group_id || 0);
		if (!equalGroup) return false;
		const equalMedia = !(mediaId && m.media) || mediaId == getMediaId(m.media)?.toString();
		return equalMedia;
	});
	if (!userMsg && limit < 200 && messages.length > 0 && botMsg.date >= (messages.last()?.date || botMsg.date + 1))
		return await getMessage(client, inputPeer, botMsg, mediaId, limit + 150);
	else if (!userMsg) {
		throw new Error(cantFindTheMessage);
	}
	if (cachedMessageCouples.find((mc) => mc.userMsg.id == userMsg.id)) {
		throw new Error(
			"Because there may be several identical messages, it is not possible to pinpoint which message is needed."
		);
	}
	messageCouple = {
		date: botMsg.date,
		creationTime: new Date(),
		botMsgId: botMsg.message_id,
		userMsg: userMsg,
	};
	cachedMessageCouples.push(messageCouple);
	return userMsg;
}
