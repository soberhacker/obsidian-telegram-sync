import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "../main.js";
import { displayAndLogError, getFormattedMessage, getForwardFromLink, getUserLink } from "./utils";
import { createFolderIfNotExist } from "src/utils/fsUtils.js";
import { TFile, TFolder, normalizePath } from "obsidian";
import { formatDateTime } from "../utils/dateUtils";
import { displayAndLog } from "src/utils/logUtils.js";
import { createProgressBar, deleteProgressBar, updateProgressBar } from "./progressBar.js";

// Delete a message or send a confirmation reply based on settings and message age
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function finalizeMessageProcessing(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, error?: any) {
	if (error) await displayAndLogError(plugin, error, msg);
	if (error || !plugin.bot) {
		return;
	}

	const currentTime = new Date();
	const messageTime = new Date(msg.date * 1000);
	const timeDifference = currentTime.getTime() - messageTime.getTime();
	const hoursDifference = timeDifference / (1000 * 60 * 60);

	if (plugin.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
		// Send the initial progress bar
		const progressBarMessage = await createProgressBar(plugin.bot, msg, "deleting");

		// Update the progress bar during the delay
		let stage = 0;
		for (let i = 1; i <= 10; i++) {
			await new Promise((resolve) => setTimeout(resolve, 50)); // 50 ms delay between updates
			stage = await updateProgressBar(plugin.bot, msg, progressBarMessage, 10, i, stage);
		}

		await plugin.bot?.deleteMessage(msg.chat.id, msg.message_id);
		await deleteProgressBar(plugin.bot, msg, progressBarMessage);
	} else {
		// Send a confirmation reply if the message is too old to be deleted
		await plugin.bot?.sendMessage(msg.chat.id, "...✅...", { reply_to_message_id: msg.message_id });
	}
}

export async function appendMessageToTelegramMd(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	formattedContent: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: any
) {
	// Do not append messages if not connected
	if (!plugin.botConnected) return;

	// Determine the location for the Telegram.md file
	const location = plugin.settings.newNotesLocation || "";
	createFolderIfNotExist(plugin.app.vault, location);

	const telegramMdPath = normalizePath(location ? `${location}/Telegram.md` : "Telegram.md");
	let telegramMdFile = plugin.app.vault.getAbstractFileByPath(telegramMdPath) as TFile;

	// Create or modify the Telegram.md file
	if (!telegramMdFile) {
		telegramMdFile = await plugin.app.vault.create(telegramMdPath, `${formattedContent}\n`);
	} else {
		const fileContent = await plugin.app.vault.read(telegramMdFile);
		await plugin.app.vault.modify(telegramMdFile, `${fileContent}\n***\n\n${formattedContent}\n`);
	}
	await finalizeMessageProcessing(plugin, msg, error);
}

// Apply a template to a message's content
export async function applyTemplate(
	plugin: TelegramSyncPlugin,
	templatePath: string,
	msg: TelegramBot.Message,
	content?: string
): Promise<string> {
	const contentMd = content || (await getFormattedMessage(msg));
	if (!templatePath) {
		return contentMd;
	}
	let templateFile: TFile;
	try {
		templateFile = plugin.app.vault.getAbstractFileByPath(normalizePath(templatePath)) as TFile;
	} catch (e) {
		await displayAndLogError(plugin, `Template "${templatePath}" not found! ${e}`, msg);
		return contentMd;
	}
	if (!templateFile || templateFile instanceof TFolder) {
		return contentMd;
	}

	const messageDateTime = new Date(msg.date * 1000);
	const creationDateTime = msg.forward_date ? new Date(msg.forward_date * 1000) : messageDateTime;
	// Check if the message is forwarded and extract the required information
	const forwardFromLink = getForwardFromLink(msg);

	const dateTimeNow = new Date();
	const templateContent = await plugin.app.vault.read(templateFile);
	return templateContent
		.replace("{{content}}", contentMd)
		.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{forwardFrom}}/g, forwardFromLink)
		.replace(/{{userId}}/g, msg.from?.id.toString() || msg.message_id.toString()) // id of the user who sent the message
		.replace(/{{user}}/g, getUserLink(msg)) // link to the user who sent the message
		.replace(/{{content:(.*?)}}/g, (_, length: string) => {
			let subContent = "";
			if (length.toLowerCase() == "firstline") {
				subContent = contentMd.split("\n")[0];
			} else if (Number.isInteger(parseFloat(length))) {
				subContent = contentMd.substring(0, Number(length));
			} else {
				displayAndLog(`Template variable {{content:${length}}} isn't supported!`, 15 * 1000);
			}
			return subContent;
		}) // message text of specified length
		.replace(/{{creationDate:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)) // date, when the message was created
		.replace(/{{creationTime:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)); // time, when the message was created
}

// example of msg object
// {
//     "message_id": 508,
//     "from": {
//         "id": 1112226370,
//         "is_bot": false,
//         "first_name": "soberHacker",
//         "username": "soberhacker",
//         "language_code": "en"
//     },
//     "chat": {
//         "id": 1112226370,
//         "first_name": "soberHacker",
//         "username": "soberhacker",
//         "type": "private"
//     },
//     "date": 1685138029,
//     "forward_from": {
//         "id": 1112226370,
//         "is_bot": false,
//         "first_name": "soberHacker",
//         "username": "soberhacker",
//         "language_code": "en"
//     },
//     "forward_date": 1684944034,
//     "text": "Text"
// }
