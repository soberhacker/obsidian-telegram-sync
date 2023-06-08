import TelegramBot from "node-telegram-bot-api";

export const fileTypes = ["photo", "video", "voice", "document", "audio", "video_note"];

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

	if (msg.forward_from || msg.forward_from_chat || msg.forward_sender_name || msg.from) {
		let username = "";
		let title = "";

		if (msg.forward_from) {
			username = msg.forward_from.username || "no_username_" + msg.forward_from.id.toString().slice(4);
			title = msg.forward_from.first_name + (msg.forward_from.last_name ? " " + msg.forward_from.last_name : "");
		} else if (msg.forward_from_chat) {
			username =
				msg.forward_from_chat.username ||
				`c/${msg.forward_from_chat.id.toString().slice(4)}/${msg.forward_from_message_id || "999999999"}`;
			title =
				msg.forward_from_chat.title + (msg.forward_signature ? `(${msg.forward_signature})` : "") ||
				msg.forward_from_chat.username ||
				"";
		} else if (msg.forward_sender_name) {
			username = "hidden_account_" + msg.forward_date;
			title = msg.forward_sender_name;
		} else if (msg.from) {
			username = msg.from.username || "no_username_" + msg.from.id.toString().slice(4);
			title = msg.from.first_name + (msg.from.last_name ? " " + msg.from.last_name : "");
		}
		forwardFromLink = forwardFromLink || `[${title}](https://t.me/${username})`;
	}

	return forwardFromLink;
}

export function getUserLink(msg: TelegramBot.Message): string {
	let userLink = "";

	if (msg.from) {
		let username = "";
		let title = "";
		username = msg.from.username || "no_username_" + msg.from.id.toString().slice(4);
		title = msg.from.first_name + (msg.from.last_name ? " " + msg.from.last_name : "");
		userLink = `[${title}](https://t.me/${username})`;
	}

	return userLink;
}

export function base64ToString(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getFileObject(msg: TelegramBot.Message): { fileType?: string; fileObject?: any } {
	for (const fileType of fileTypes) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if ((msg as any)[fileType]) {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			return { fileType: fileType, fileObject: (msg as any)[fileType] };
		}
	}
	return {};
}
