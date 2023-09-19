import TelegramBot from "node-telegram-bot-api";
import LinkifyIt from "linkify-it";
import TelegramSyncPlugin from "src/main";
import { Topic } from "src/settings/Settings";

export const fileTypes = ["photo", "video", "voice", "document", "audio", "video_note"];

export function getForwardFromName(msg: TelegramBot.Message): string {
	let forwardFromName = "";

	if (msg.forward_from || msg.forward_from_chat || msg.forward_sender_name || msg.from) {
		if (msg.forward_from) {
			forwardFromName =
				msg.forward_from.first_name + (msg.forward_from.last_name ? " " + msg.forward_from.last_name : "");
		} else if (msg.forward_from_chat) {
			forwardFromName =
				msg.forward_from_chat.title + (msg.forward_signature ? `(${msg.forward_signature})` : "") ||
				msg.forward_from_chat.username ||
				"";
		} else if (msg.forward_sender_name) {
			forwardFromName = msg.forward_sender_name;
		} else if (msg.from) {
			forwardFromName = msg.from.first_name + (msg.from.last_name ? " " + msg.from.last_name : "");
		}
	}

	return forwardFromName;
}

export function getForwardFromLink(msg: TelegramBot.Message): string {
	let forwardFromLink = "";

	if (msg.forward_from || msg.forward_from_chat || msg.forward_sender_name || msg.from) {
		const forwardFromName = getForwardFromName(msg);
		let username = "";

		if (msg.forward_from) {
			username = msg.forward_from.username || "no_username_" + msg.forward_from.id.toString().slice(4);
		} else if (msg.forward_from_chat) {
			username =
				(msg.forward_from_chat.username || "c/" + msg.forward_from_chat.id.toString().slice(4)) +
				"/" +
				(msg.forward_from_message_id || "999999999");
		} else if (msg.forward_sender_name) {
			username = "hidden_account_" + msg.forward_date;
		} else if (msg.from) {
			username = msg.from.username || "no_username_" + msg.from.id.toString().slice(4);
		}
		forwardFromLink = `[${forwardFromName}](https://t.me/${username})`;
	}

	return forwardFromLink;
}

export function getUserLink(msg: TelegramBot.Message): string {
	if (!msg.from) return "";

	const username = msg.from.username || "no_username_" + msg.from.id.toString().slice(4);
	const fullName = `${msg.from.first_name} ${msg.from.last_name || ""}`.trim();
	return `[${fullName}](https://t.me/${username})`;
}

export function getChatName(msg: TelegramBot.Message): string {
	let chatName = "";
	if (msg.chat.type == "private") {
		chatName = `${msg.chat.first_name} ${msg.chat.last_name || ""}`.trim();
	} else {
		chatName = msg.chat.title || msg.chat.type + msg.chat.id;
	}
	return chatName;
}

export function getChatLink(msg: TelegramBot.Message): string {
	let userName = "";
	if (msg.chat.type == "private") {
		userName = msg.chat.username || "no_username_" + msg.chat.id.toString().slice(4);
	} else {
		const threadId = msg.chat.is_forum
			? msg.message_thread_id || msg.reply_to_message?.message_thread_id || "1"
			: "";
		const chatId = msg.chat.id.toString().slice(4);
		userName = msg.chat.username || `c/${chatId}/${threadId}/${msg.message_id}`;
		userName = userName.replace(/\/\//g, "/"); // because threadId can be empty
	}
	const chatName = getChatName(msg);
	const chatLink = `[${chatName}](https://t.me/${userName})`;
	return chatLink;
}

export function getUrl(msg: TelegramBot.Message, num = 1, lookInCaptions = true): string {
	const text = (msg.text || "") + (lookInCaptions && msg.caption ? msg.caption : "");
	if (!text) return "";

	const linkify = LinkifyIt();
	const matches = linkify.match(text);
	return matches ? matches[num - 1].url : "";
}

export function getHashtag(msg: TelegramBot.Message, num = 1, lookInCaptions = true): string {
	const text = (msg.text || "") + (lookInCaptions && msg.caption ? msg.caption : "");
	if (!text) return "";

	const hashtags = text.match(/#\w+/g) || [];
	return hashtags[num - 1] || "";
}

export function getInlineUrls(msg: TelegramBot.Message): string {
	let urls = "";
	if (!msg.reply_markup?.inline_keyboard || msg.reply_markup.inline_keyboard.length == 0) return "";
	msg.reply_markup.inline_keyboard.forEach((buttonsGroup) => {
		buttonsGroup.forEach((button) => {
			if (button.url) {
				urls += `[${button.text}](${button.url})\n`;
			}
		});
	});
	return urls.trimEnd();
}

export function getTopicId(msg: TelegramBot.Message): number | undefined {
	return (msg.chat.is_forum && (msg.message_thread_id || msg.reply_to_message?.message_thread_id || 1)) || undefined;
}

export async function getTopic(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	throwError = true,
): Promise<Topic | undefined> {
	if (!msg.chat.is_forum) return undefined;

	const reply = msg.reply_to_message;
	const topicId = getTopicId(msg) || 1;
	let topic = plugin.settings.topicNames.find((tn) => tn.chatId == msg.chat.id && tn.topicId == topicId);
	if (!topic && reply?.forum_topic_created?.name) {
		topic = {
			name: reply?.forum_topic_created?.name,
			chatId: msg.chat.id,
			topicId: topicId,
		};
		plugin.settings.topicNames.push(topic);
		await plugin.saveSettings();
	}
	if (!topic && throwError) {
		throw new Error(
			"Telegram bot has a limitation to get topic names. if the topic name displays incorrect, set the name manually using bot command `/topicName NAME`",
		);
	}
	return topic;
}

export async function getTopicLink(plugin: TelegramSyncPlugin, msg: TelegramBot.Message): Promise<string> {
	if (!msg.chat.is_forum) return "";
	const topic = await getTopic(plugin, msg);
	if (!topic) return "";
	const path = (msg.chat.username || `c/${topic.chatId.toString().slice(4)}`) + `/${topic.topicId}`;
	return `[${topic.name}](https://t.me/${path})`;
}

export function getReplyMessageId(msg: TelegramBot.Message): string {
	const reply = msg.reply_to_message;
	if (reply && reply.message_thread_id != reply.message_id) {
		return reply.message_id.toString();
	}
	return "";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFileObject(msg: TelegramBot.Message): { fileType: string; fileObject?: any } {
	for (const fileType of fileTypes) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((msg as any)[fileType]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return { fileType: fileType, fileObject: (msg as any)[fileType] };
		}
	}
	return { fileType: "undefined", fileObject: undefined };
}
