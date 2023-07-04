import TelegramBot from "node-telegram-bot-api";
import { Api, TelegramClient } from "telegram";
import { getFileObject } from "../message/getters";
import { extractMediaId } from "./convertBotFileToMessageMedia";

interface MessageCouple {
	date: number;
	botMsgId: number;
	clientMsgId?: number;
}
export let _listOfMessagesSentTogether: MessageCouple[] = [];

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

export async function getInputPeerUser(
	client: TelegramClient,
	clientUser: Api.User,
	botUser: TelegramBot.User,
	botMsg: TelegramBot.Message,
	limit = 10
): Promise<Api.TypeInputPeer> {
	const chatId = botMsg.chat.id == clientUser.id.toJSNumber() ? botUser.id : botMsg.chat.id;
	const dialogs = await client.getDialogs({ limit });
	const dialog = dialogs.find((d) => d.id?.toJSNumber() == chatId);
	if (!dialog && limit <= 50) return await getInputPeerUser(client, clientUser, botUser, botMsg, limit + 10);
	else if (!dialog || !dialog.inputEntity) {
		console.log(dialogs);
		throw new Error(
			`User ${clientUser.username || clientUser.firstName || clientUser.id} does not have chat with ${
				botMsg.chat.username || botMsg.chat.title || botMsg.chat.first_name || botMsg.chat.id
			} `
		);
	}
	return dialog.inputEntity;
}

export async function getMessage(
	client: TelegramClient,
	inputPeerUser: Api.TypeInputPeer,
	botMsg: TelegramBot.Message,
	mediaId?: string,
	limit = 50
): Promise<Api.Message> {
	// wait for finishing other message searchs (max 10sec)
	for (let i = 1; i < 20; i++) {
		if (!_listOfMessagesSentTogether.find((msgCouple) => msgCouple.date == botMsg.date && !msgCouple.clientMsgId))
			break;
		await new Promise((resolve) => setTimeout(resolve, 500));
	}

	let messageCouple = _listOfMessagesSentTogether.find((msgCouple) => msgCouple.botMsgId == botMsg.message_id);
	if (!messageCouple) {
		messageCouple = {
			date: botMsg.date,
			botMsgId: botMsg.message_id,
			clientMsgId: undefined,
		};
		_listOfMessagesSentTogether.push(messageCouple);
	} else if (messageCouple.clientMsgId) {
		const messages = await client.getMessages(inputPeerUser, { ids: messageCouple.clientMsgId });
		return messages[0];
	}
	try {
		if (!botMsg.text && !mediaId) {
			const { fileObject } = getFileObject(botMsg);
			const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
			mediaId = extractMediaId(fileObjectToUse.file_id);
		}
		const skipMsgs = _listOfMessagesSentTogether.filter((msgCouple) => msgCouple.date == botMsg.date);
		// if other dates have already proccessed, clean unnecessary
		if (!_listOfMessagesSentTogether.find((msgCouple) => !msgCouple.clientMsgId && msgCouple.date != botMsg.date))
			_listOfMessagesSentTogether = skipMsgs;
		const skipMsgIds = skipMsgs
			.filter((msgCouple) => msgCouple.botMsgId != botMsg.message_id)
			.map((msgCouple) => msgCouple.clientMsgId);
		let messages = await client.getMessages(inputPeerUser, { limit, reverse: true, offsetDate: botMsg.date - 1 });
		const total = messages.total || limit;
		messages = messages.filter((msg) => !skipMsgIds.contains(msg.id));
		const clientMsg = messages.find(
			(m) =>
				m.date == botMsg.date &&
				(m.message || "") == (botMsg.text || botMsg.caption || "") &&
				((mediaId && m.media && mediaId == getMediaId(m.media)?.toString()) || !(mediaId && m.media))
		);
		if (
			!clientMsg &&
			limit <= 200 &&
			total > limit &&
			messages.length > 0 &&
			botMsg.date >= (messages.last()?.date || botMsg.date + 1)
		)
			return await getMessage(client, inputPeerUser, botMsg, mediaId, limit + 50);
		else if (!clientMsg) {
			console.log(messages);
			throw new Error("Can't find the message for connected user");
		}
		messageCouple.clientMsgId = clientMsg.id;
		return clientMsg;
	} catch (e) {
		_listOfMessagesSentTogether.remove(messageCouple);
		throw e;
	}
}
