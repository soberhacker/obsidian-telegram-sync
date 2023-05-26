import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "../main.js";
import { createProgressBarKeyboard, getFormattedMessage, getForwardFromLink } from "./utils";
import { createFolderIfNotExist } from "src/utils/fsUtils.js";
import { TFile, normalizePath } from "obsidian";
import { formatDateTime } from "../utils/dateUtils";

// Delete a message or send a confirmation reply based on settings and message age
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function finalizeMessageProcessing(this: TelegramSyncPlugin, msg: TelegramBot.Message, error?: any) {
	if (error) {
		await this.displayAndLogError(error, msg);
		return;
	}

	const currentTime = new Date();
	const messageTime = new Date(msg.date * 1000);
	const timeDifference = currentTime.getTime() - messageTime.getTime();
	const hoursDifference = timeDifference / (1000 * 60 * 60);

	if (this.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
		// Send the initial progress bar
		const progressBarMessage = await this.bot?.sendMessage(msg.chat.id, ".", {
			reply_to_message_id: msg.message_id,
			reply_markup: { inline_keyboard: createProgressBarKeyboard(0).inline_keyboard },
		});

		// Update the progress bar during the delay
		for (let i = 1; i <= 10; i++) {
			await new Promise((resolve) => setTimeout(resolve, 50)); // 50 ms delay between updates
			await this.bot?.editMessageReplyMarkup(
				{
					inline_keyboard: createProgressBarKeyboard(i).inline_keyboard,
				},
				{ chat_id: msg.chat.id, message_id: progressBarMessage?.message_id }
			);
		}

		await this.bot?.deleteMessage(msg.chat.id, msg.message_id);

		if (progressBarMessage) {
			await this.bot?.deleteMessage(msg.chat.id, progressBarMessage.message_id);
		}
	} else {
		// Send a confirmation reply if the message is too old to be deleted
		await this.bot?.sendMessage(msg.chat.id, "...✅...", { reply_to_message_id: msg.message_id });
	}
}

export async function appendMessageToTelegramMd(
	this: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	formattedContent: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: any
) {
	// Do not append messages if not connected
	if (!this.connected) return;

	// Determine the location for the Telegram.md file
	const location = this.settings.newNotesLocation || "";
	createFolderIfNotExist(this.app.vault, location);

	const telegramMdPath = normalizePath(location ? `${location}/Telegram.md` : "Telegram.md");
	let telegramMdFile = this.app.vault.getAbstractFileByPath(telegramMdPath) as TFile;

	// Create or modify the Telegram.md file
	if (!telegramMdFile) {
		telegramMdFile = await this.app.vault.create(telegramMdPath, `${formattedContent}\n`);
	} else {
		const fileContent = await this.app.vault.read(telegramMdFile);
		await this.app.vault.modify(telegramMdFile, `${fileContent}\n***\n\n${formattedContent}\n`);
	}
	await this.finalizeMessageProcessing(msg, error);
}

// Apply a template to a message's content
export async function applyTemplate(
	this: TelegramSyncPlugin,
	templatePath: string,
	msg: TelegramBot.Message,
	content?: string
): Promise<string> {
	const templateFile = this.app.vault.getAbstractFileByPath(normalizePath(templatePath)) as TFile;
	const contentMd = content || (await getFormattedMessage(msg));
	if (!templateFile) {
		return contentMd;
	}

	const messageDateTime = new Date(msg.date * 1000);
	// Check if the message is forwarded and extract the required information
	const forwardFromLink = getForwardFromLink(msg);

	const dateTimeNow = new Date();
	const templateContent = await this.app.vault.read(templateFile);
	return templateContent
		.replace("{{content}}", contentMd)
		.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{forwardFrom}}/g, forwardFromLink);
}
