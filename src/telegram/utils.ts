import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "src/main";
import { displayAndLog } from "src/utils/logUtils";

export function sanitizeFileName(fileName: string): string {
	const invalidCharacters = /[\\/:*?"<>|\n\r]/g;
	const replacementCharacter = "_";
	return fileName.replace(invalidCharacters, replacementCharacter);
}

export async function getFormattedMessage(msg: TelegramBot.Message): Promise<string> {
	let text = msg.text || "";

	if (msg.entities) {
		let offset = 0;
		for (const entity of msg.entities) {
			const entityStart = entity.offset + offset;
			let entityEnd = entityStart + entity.length;

			let entityText = text.slice(entityStart, entityEnd);

			if (entityText.endsWith("\n")) {
				entityEnd = entityEnd - 1;
			}
			const beforeEntity = text.slice(0, entityStart);
			entityText = text.slice(entityStart, entityEnd);
			const afterEntity = text.slice(entityEnd);

			switch (entity.type) {
				case "bold":
					entityText = `**${entityText}**`;
					offset += 4;
					break;
				case "italic":
					entityText = `*${entityText}*`;
					offset += 2;
					break;
				case "underline":
					entityText = `<u>${entityText}</u>`;
					offset += 7;
					break;
				case "strikethrough":
					entityText = `~~${entityText}~~`;
					offset += 4;
					break;
				case "code":
					entityText = "`" + entityText + "`";
					offset += 2;
					break;
				case "pre":
					entityText = "```\n" + entityText + "\n```";
					offset += 8;
					break;
				case "text_link":
					if (entity.url) {
						entityText = `[${entityText}](${entity.url})`;
						offset += 4 + entity.url.length;
					}
					break;
				default:
					break;
			}
			text = beforeEntity + entityText + afterEntity;
		}
	}

	return text;
}

export function getForwardFromLink(msg: TelegramBot.Message): string {
	let forwardFromLink = "";

	if (msg.forward_from || msg.forward_from_chat || msg.forward_sender_name) {
		let username = "";
		let title = "";

		if (msg.forward_from) {
			username = msg.forward_from.username || `user=${msg.forward_from.id.toString()}`;
			title = msg.forward_from.first_name + (msg.forward_from.last_name ? " " + msg.forward_from.last_name : "");
		} else if (msg.forward_from_chat) {
			username = msg.forward_from_chat.username || `chat=${msg.forward_from_chat.id.toString()}`;
			title = msg.forward_from_chat.title || msg.forward_from_chat.username || "";
		} else if (msg.forward_sender_name) {
			forwardFromLink = `[${msg.forward_sender_name}](the account was hidden by the user)`;
		}
		forwardFromLink = forwardFromLink || `[${title}](https://t.me/${username})`;
	}

	return forwardFromLink;
}

export function base64ToString(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFileObject(msg: TelegramBot.Message, fileType: string): any {
	switch (fileType) {
		case "photo":
			return msg.photo;
		case "video":
			return msg.video;
		case "voice":
			return msg.voice;
		case "document":
			return msg.document;
		case "audio":
			return msg.audio;
		case "video_note":
			return msg.video_note;
		default:
			return undefined;
	}
}

// Create a progress bar keyboard for message deletion
export function createProgressBarKeyboard(progress: number) {
	const progressBar = "▓".repeat(progress) + "░".repeat(10 - progress);
	return {
		inline_keyboard: [
			[
				{
					text: progressBar,
					callback_data: JSON.stringify({ action: "update_progress", progress: progress }),
				},
			],
		],
	};
}

// Show error to console, telegram, display
export async function displayAndLogError(
	this: TelegramSyncPlugin,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error: any,
	msg?: TelegramBot.Message,
	timeout = 5 * 1000
) {
	const beautyError = `Error: ${error}`.replace(/^Error:\s*/, "");
	displayAndLog(beautyError, timeout);
	if (msg) {
		await this.bot?.sendMessage(msg.chat.id, `...❌...\n\n${beautyError}`, {
			reply_to_message_id: msg.message_id,
		});
	}
}
