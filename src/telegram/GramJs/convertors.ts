import TelegramBot from "node-telegram-bot-api";
import { Api, TelegramClient } from "telegram";
import { getFileObject } from "../message/getters";
import { extractMediaId } from "./convertBotFileToMessageMedia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getMediaId(media: any): number | undefined {
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
	mediaId?: number,
	limit = 50
): Promise<Api.Message> {
	if (!botMsg.text && !mediaId) {
		const { fileObject } = getFileObject(botMsg);
		const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
		mediaId = extractMediaId(fileObjectToUse.file_id);
	}
	const messages = await client.getMessages(inputPeerUser, { limit });
	const clientMsg = messages.find(
		(m) => (m.message && m.message == botMsg.text) || (!m.message && mediaId && getMediaId(m.media) == mediaId)
	);
	if (!clientMsg && limit <= 200) return await getMessage(client, inputPeerUser, botMsg, mediaId, limit + 50);
	else if (!clientMsg) {
		console.log(messages);
		throw new Error(`Can't find the message using Telegram Client Api`);
	}
	return clientMsg;
}
