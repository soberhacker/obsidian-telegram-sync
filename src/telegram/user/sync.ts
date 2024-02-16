import { Api } from "telegram";
import { checkUserService, subscribedOnInsiderChannel } from "./client";
import { getOffsetDate } from "src/utils/dateUtils";
import TelegramSyncPlugin from "src/main";
import { Dialog } from "telegram/tl/custom/dialog";
import { _5sec, cleanErrorCache, displayAndLog, displayAndLogError, doNotHide, errorCache } from "src/utils/logUtils";
import { Notice } from "obsidian";
import TelegramBot from "node-telegram-bot-api";
import { extractMediaId } from "../convertors/botFileToMessageMedia";
import { getFileObject } from "../bot/message/getters";
import { findUserMsg } from "../convertors/botMessageToClientMessage";
import bigInt from "big-integer";
import { getChat, getUser } from "../convertors/clientMessageToBotMessage";

const defaultDaysLimit = 14;
const defaultDialogsLimit = 100;
const defaultMessagesLimit = 1000;
const _24hours = 24 * 60 * 60;

interface ForwardedMessage {
	original: Api.Message;
	forwarded: Api.Message;
}

interface ChatForSearch {
	name: string;
	peer: Api.TypeInputPeer;
}

export interface ProcessOldMessagesSettings {
	lastProcessingDate: number;
	daysLimit: number;
	dialogsLimit: number;
	messagesLimit: number;
	chatsForSearch: ChatForSearch[];
}

export let cachedUnprocessedMessages: ForwardedMessage[] = [];
export let canUpdateProcessingDate = true;

export function getDefaultProcessOldMessagesSettings(): ProcessOldMessagesSettings {
	return {
		lastProcessingDate: getOffsetDate(),
		daysLimit: defaultDaysLimit,
		dialogsLimit: defaultDialogsLimit,
		messagesLimit: defaultMessagesLimit,
		chatsForSearch: [],
	};
}

export async function getChatsForSearch(plugin: TelegramSyncPlugin, offsetDays: number): Promise<ChatForSearch[]> {
	let progress = "\n\n...";
	let notification = `1 of 3\nSearching for chats with activity in the last "${offsetDays}" days`;
	const notice = new Notice(notification + progress, doNotHide);
	const { checkedClient } = await checkUserService();
	const botUserName = plugin.botUser?.username;
	if (!botUserName) {
		notice.setMessage("Can't execute searching for chats because can't identify bot username");
		return [];
	}
	let allDialogs: Dialog[] = [];
	try {
		allDialogs = await checkedClient.getDialogs({ limit: plugin.settings.processOldMessagesSettings.dialogsLimit });
	} catch (e) {
		notice.setMessage(`Search for "${botUserName}" in chats cancelled!\nError: ${JSON.stringify(e)}`);
	}
	allDialogs = allDialogs.filter(
		(dialog) =>
			(!dialog.isUser || dialog.id?.toJSNumber() == plugin.botUser?.id) &&
			dialog.date > getOffsetDate(offsetDays),
	);
	notification = `${notification}\n\n2 of 3\nFiltering chats by bot "${botUserName}"`;
	const chatsForSearch: ChatForSearch[] = [];
	for (const dialog of allDialogs) {
		notice.setMessage(notification + progress);
		progress = progress + ".";
		const peer = dialog.inputEntity;
		const dialogName = dialog.title || dialog.name || dialog.id?.toString() || peer.toString();
		if (dialog.isUser) {
			chatsForSearch.push({ name: dialogName, peer });
			continue;
		}
		let participants: Api.User[] = [];
		try {
			participants = await checkedClient.getParticipants(dialog.dialog.peer, {
				filter: new Api.ChannelParticipantsBots(),
				search: botUserName,
			});
		} catch (e) {
			if (e instanceof Error && e.message.contains("CHAT_ADMIN_REQUIRED")) continue;
			notice.setMessage(
				`Search for ${botUserName} in ${dialogName} participants cancelled!\nError: ${JSON.stringify(e)}`,
			);
		}
		if (participants.length > 0) chatsForSearch.push({ name: dialogName, peer });
	}
	notice.hide();
	new Notice(`${notification}\n\n3 of 3\nDone`, _5sec);
	return chatsForSearch;
}

export async function getUnprocessedMessages(plugin: TelegramSyncPlugin): Promise<Api.Message[]> {
	const botId = plugin.botUser?.id;
	if (!botId) {
		displayAndLogError(
			plugin,
			new Error("Can't execute searching for old unprocessed messages because can't identify bot id"),
		);
		return [];
	}
	const { checkedClient } = await checkUserService();
	const oneDayAgo = getOffsetDate(1);
	const processOldMessagesSettings = plugin.settings.processOldMessagesSettings;
	let offsetDate = getOffsetDate(processOldMessagesSettings.daysLimit);
	if (processOldMessagesSettings.lastProcessingDate > offsetDate)
		offsetDate = processOldMessagesSettings.lastProcessingDate;
	const unprocessedMessages: Api.Message[] = [];
	for (const chat of processOldMessagesSettings.chatsForSearch) {
		let messages: Api.Message[] = [];
		try {
			const peer = correctPeerObject(chat.peer);
			messages = await checkedClient.getMessages(peer, {
				limit: processOldMessagesSettings.messagesLimit,
				reverse: true,
				scheduled: false,
				offsetDate,
				waitTime: 2,
			});
		} catch (e) {
			displayAndLogError(
				plugin,
				e,
				`Search for old unprocessed messages in ${chat.name} cancelled!`,
				undefined,
				undefined,
				0,
				true,
			);
		}

		messages = messages.filter((msg) => {
			// filter messages available for bot if order is not important
			if (msg.date > oneDayAgo && plugin.settings.parallelMessageProcessing) return false;

			// skip sync bot replies
			if (msg.fromId && msg.fromId instanceof Api.PeerUser && msg.fromId.userId.toJSNumber() == botId)
				return false;

			// skip already processed messages
			const reactions = msg.reactions?.results;
			if (
				reactions &&
				reactions.find(
					(reaction) =>
						reaction.reaction instanceof Api.ReactionEmoji &&
						["👍", "👌"].includes(reaction.reaction.emoticon),
				)
			)
				return false;

			return true;
		});
		if (messages.find((msg) => msg.date <= oneDayAgo)) unprocessedMessages.push(...messages);
	}
	return unprocessedMessages;
}

export async function forwardUnprocessedMessages(plugin: TelegramSyncPlugin) {
	const processOldMessagesSettings = plugin.settings.processOldMessagesSettings;
	if (!(await subscribedOnInsiderChannel())) return;
	if (processOldMessagesSettings.chatsForSearch.length == 0) {
		displayAndLog(plugin, "Processing old messages is skipped because chats for search are not listed", 0);
		return;
	}
	const nowDate = getOffsetDate();
	const lastProcessingDate = processOldMessagesSettings.lastProcessingDate;
	if (Math.abs(nowDate - lastProcessingDate) < _24hours) return;

	cleanErrorCache();
	stopUpdatingProcessingDate();
	const unprocessedMessages = await getUnprocessedMessages(plugin);
	clearCachedUnprocessedMessages();
	try {
		for (const message of unprocessedMessages) {
			try {
				if (message.forward && message.forward.chatId && !message.forward._chat)
					message.forward._chat = await message.forward.getChat();
				const forwardedMessage = getFirstMessage(await message.forwardTo(message.inputChat || message.peerId));
				if (!errorCache) processOldMessagesSettings.lastProcessingDate = message.date;
				cachedUnprocessedMessages.push({ original: message, forwarded: forwardedMessage });
			} catch (e) {
				displayAndLogError(
					plugin,
					e,
					`Forwarding message "${message.message.slice(0, 100)}..." cancelled!`,
					undefined,
					undefined,
					0,
					true,
				);
			}
		}

		if (!errorCache) {
			processOldMessagesSettings.lastProcessingDate = nowDate;
			canUpdateProcessingDate = true;
		} else if (plugin.bot) {
			const { checkedUser } = await checkUserService();
			await plugin.bot.sendMessage(
				checkedUser.id.toJSNumber(),
				`❌ ERRORS DURING SEARCH OF OLD UNPROCESSED MESSAGES:\n${errorCache}`,
			);
			cleanErrorCache();
		}
	} finally {
		await plugin.saveSettings();
	}
}

export function addOriginalUserMsg(botMsg: TelegramBot.Message) {
	if (cachedUnprocessedMessages.length == 0) return;

	let mediaId = "";
	if (!botMsg.text) {
		const { fileObject } = getFileObject(botMsg);
		const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
		mediaId = extractMediaId(fileObjectToUse.file_id);
	}

	const originalMessages = cachedUnprocessedMessages.map((userMsg) => userMsg.original);

	const userMsg = findUserMsg(originalMessages, botMsg, mediaId);

	if (userMsg) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(botMsg as any).userMsg = userMsg;
		return;
	}

	const forwardedMessages = cachedUnprocessedMessages.map((userMsg) => userMsg.forwarded);

	const forwardedMsg = findUserMsg(forwardedMessages, botMsg, mediaId);

	if (!forwardedMsg) return;

	const unprocessedMessage = cachedUnprocessedMessages.find((msg) => msg.forwarded.id == forwardedMsg.id);

	if (!unprocessedMessage) return;
	const originalMsg = unprocessedMessage.original;
	try {
		botMsg.edit_date = originalMsg.editDate;
		botMsg.date = originalMsg.date;
		botMsg.from = originalMsg.sender ? getUser(originalMsg.sender) : undefined;
		botMsg.forward_date = originalMsg.fwdFrom?.date;
		botMsg.forward_from = originalMsg.forward?.sender ? getUser(originalMsg.forward.sender) : undefined;
		botMsg.forward_from_chat = originalMsg.forward?.chat ? getChat(originalMsg.forward.chat) : undefined;
		botMsg.forward_from_message_id = originalMsg.fwdFrom?.channelPost;
		botMsg.forward_sender_name = originalMsg.fwdFrom?.fromName;
		botMsg.forward_signature = originalMsg.fwdFrom?.postAuthor;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		(botMsg as any).originalUserMsg = originalMsg;
	} finally {
		cachedUnprocessedMessages.remove(unprocessedMessage);
	}
}

export function stopUpdatingProcessingDate() {
	canUpdateProcessingDate = false;
}

export function clearCachedUnprocessedMessages() {
	cachedUnprocessedMessages = [];
}

function correctPeerObject(peer: Api.TypeInputPeer): Api.TypeInputPeer {
	if (peer.className == "InputPeerChannel")
		return new Api.InputPeerChannel({ channelId: peer.channelId, accessHash: peer.accessHash });
	else if (peer.className == "InputPeerChat") return new Api.InputPeerChat({ chatId: peer.chatId });
	else if (peer.className == "InputPeerUser")
		return new Api.InputPeerUser({ userId: peer.userId, accessHash: peer.accessHash });
	else return new Api.InputPeerUser({ userId: bigInt(0), accessHash: bigInt(0) });
}

function getFirstMessage(messages: Api.Message[] | Api.Message[][] | undefined): Api.Message {
	if (!messages || messages.length == 0) throw new Error("Unknown forwarding error");
	if (Array.isArray(messages[0])) {
		return messages[0][0];
	} else {
		return messages[0];
	}
}
