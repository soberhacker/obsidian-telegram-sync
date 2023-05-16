import { TFile } from "obsidian";
import TelegramSyncPlugin from "../main";
import TelegramBot from "node-telegram-bot-api";
import {
	getFormattedMessage,
	sanitizeFileName,
	getFileObject,
	createProgressBarKeyboard,
	getForwardFromLink,
} from "./utils";
import { date2DateString, date2TimeString } from "src/utils/dateUtils";
import { createFolderIfNotExist } from "src/utils/fsUtils";
import path from "path";

export async function handleMessage(this: TelegramSyncPlugin, msg: TelegramBot.Message) {
	let formattedContent = "";

	if (!msg.text || msg.text == "") {
		await this.handleFiles(msg);
		return;
	}

	// Check if message has been sended by allowed usernames
	const telegramUserName = msg.from?.username ?? "";
	const allowedChatFromUsernames = this.settings.allowedChatFromUsernames;

	if (!telegramUserName || !allowedChatFromUsernames.includes(telegramUserName)) {
		this.bot?.sendMessage(
			msg.chat.id,
			`Access denied. Add your username ${telegramUserName} in "Allowed Chat From Usernames" list.`,
			{ reply_to_message_id: msg.message_id }
		);
		return;
	}

	const markDownText = await getFormattedMessage(msg);
	const rawText = msg.text;
	const location = this.settings.newNotesLocation || "";
	await createFolderIfNotExist(this.app.vault, location);

	const templateFileLocation = this.settings.templateFileLocation;

	const messageDate = new Date(msg.date * 1000);
	const messageDateString = date2DateString(messageDate);
	const messageTimeString = date2TimeString(messageDate);

	// Check if the message is forwarded and extract the required information
	const forwardFromLink = getForwardFromLink(msg);

	formattedContent = await this.applyTemplate(templateFileLocation, markDownText, messageDate, forwardFromLink);

	const appendAllToTelegramMd = this.settings.appendAllToTelegramMd;

	if (appendAllToTelegramMd) {
		this.messageQueueToTelegramMd.push({ msg, formattedContent });
	} else {
		const title = sanitizeFileName(rawText.slice(0, 20));
		let fileName = `${title} - ${messageDateString}${messageTimeString}.md`;
		let notePath = location ? `${location}/${fileName}` : fileName;
		while (
			this.listOfNotePaths.includes(notePath) ||
			this.app.vault.getAbstractFileByPath(notePath) instanceof TFile
		) {
			const newMessageTimeString = date2TimeString(messageDate);
			fileName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
			notePath = location ? `${location}/${fileName}` : fileName;
		}
		this.listOfNotePaths.push(notePath);
		await this.app.vault.create(notePath, formattedContent);
		await this.deleteMessage(msg);
	}
}

// Handle files received in messages
export async function handleFiles(this: TelegramSyncPlugin, msg: TelegramBot.Message) {
	const fileTypes = ["photo", "video", "voice", "document", "audio", "video_note"];
	const basePath = this.settings.newFilesLocation || this.settings.newNotesLocation || "";
	await createFolderIfNotExist(this.app.vault, basePath);

	// Iterate through each file type
	for (const fileType of fileTypes) {
		// Get the file object for the current file type
		const fileObject = getFileObject(msg, fileType);
		if (!fileObject) {
			continue;
		}
		const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
		const fileId = fileObjectToUse.file_id;
		const fileLink = await this.bot?.getFileLink(fileId);
		const telegramFileName = fileLink?.split("/").pop() || "";
		const fileExtension = path.extname(telegramFileName);
		const fileName = path.basename(telegramFileName, fileExtension);

		// Create a specific folder for each file type
		const specificFolder = `${basePath}/${fileType}s`;
		await createFolderIfNotExist(this.app.vault, specificFolder);

		// Format the file name and path
		const messageDate = new Date(msg.date * 1000);
		const messageDateString = date2DateString(messageDate);
		const messageTimeString = date2TimeString(messageDate);

		const fileFullName = `${fileName} - ${messageDateString}${messageTimeString}${fileExtension}`;
		const filePath = `${specificFolder}/${fileFullName}`;

		// Download the file and write it to the vault
		const fileStream = this.bot?.getFileStream(fileId);
		const fileChunks: Uint8Array[] = [];

		if (!fileStream) {
			return;
		}

		for await (const chunk of fileStream) {
			fileChunks.push(new Uint8Array(chunk));
		}

		const fileByteArray = new Uint8Array(
			fileChunks.reduce<number[]>((acc, val) => {
				acc.push(...val);
				return acc;
			}, [])
		);
		await this.app.vault.createBinary(filePath, fileByteArray);

		// Handle message captions and append to Telegram.md if necessary
		if (msg.caption && !(msg.caption === "")) {
			const captionMarkdown = `![](${filePath.replace(/\s/g, "%20")})\n${msg.caption}`;
			const forwardFromLink = getForwardFromLink(msg);
			const formattedContent = await this.applyTemplate(
				this.settings.templateFileLocation,
				captionMarkdown,
				messageDate,
				forwardFromLink
			);
			if (this.settings.appendAllToTelegramMd) {
				this.messageQueueToTelegramMd.push({ msg, formattedContent });
				break;
			} else {
				// Save caption as a separate note
				const noteLocation = this.settings.newNotesLocation || "";
				const title = sanitizeFileName(msg.caption.slice(0, 20));
				let fileCaptionName = `${title} - ${messageDateString}${messageTimeString}.md`;
				let notePath = noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName;

				while (
					this.listOfNotePaths.includes(notePath) ||
					this.app.vault.getAbstractFileByPath(notePath) instanceof TFile
				) {
					const newMessageTimeString = date2TimeString(messageDate);
					fileCaptionName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
					notePath = noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName;
				}
				this.listOfNotePaths.push(notePath);
				await this.app.vault.create(notePath, formattedContent);
			}
		}
		await this.deleteMessage(msg);
		break;
	}
}

// Delete a message or send a confirmation reply based on settings and message age
export async function deleteMessage(this: TelegramSyncPlugin, msg: TelegramBot.Message) {
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
