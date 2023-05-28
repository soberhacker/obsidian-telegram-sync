import { TFile, normalizePath } from "obsidian";
import TelegramSyncPlugin from "../main";
import TelegramBot from "node-telegram-bot-api";
import { sanitizeFileName, getFileObject } from "./utils";
import { date2DateString, date2TimeString } from "src/utils/dateUtils";
import { createFolderIfNotExist } from "src/utils/fsUtils";
import { bugFixes, newFeatures, pluginVersion, possibleRoadMap } from "../../release-notes.mjs";
import { buyMeACoffeeLink, cryptoDonationLink, kofiLink, paypalLink } from "../settings/donation.js";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";

// handle all messages from Telegram
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
			`Access denied. Add your username ${telegramUserName} in the plugin setting "Allowed Chat From Usernames".`,
			{ reply_to_message_id: msg.message_id }
		);
		return;
	}

	const rawText = msg.text;
	const location = this.settings.newNotesLocation || "";
	await createFolderIfNotExist(this.app.vault, location);

	const templateFileLocation = this.settings.templateFileLocation;

	const messageDate = new Date(msg.date * 1000);
	const messageDateString = date2DateString(messageDate);
	const messageTimeString = date2TimeString(messageDate);

	formattedContent = await this.applyTemplate(templateFileLocation, msg);

	const appendAllToTelegramMd = this.settings.appendAllToTelegramMd;

	if (appendAllToTelegramMd) {
		this.messageQueueToTelegramMd.push({ msg, formattedContent });
		return;
	} else {
		const title = sanitizeFileName(rawText.slice(0, 20));
		let fileName = `${title} - ${messageDateString}${messageTimeString}.md`;
		let notePath = normalizePath(location ? `${location}/${fileName}` : fileName);
		while (
			this.listOfNotePaths.includes(notePath) ||
			this.app.vault.getAbstractFileByPath(notePath) instanceof TFile
		) {
			const newMessageTimeString = date2TimeString(messageDate);
			fileName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
			notePath = normalizePath(location ? `${location}/${fileName}` : fileName);
		}
		this.listOfNotePaths.push(notePath);
		await this.app.vault.create(notePath, formattedContent);
		await this.finalizeMessageProcessing(msg);
	}
}

// Handle files received in messages
export async function handleFiles(this: TelegramSyncPlugin, msg: TelegramBot.Message) {
	const fileTypes = ["photo", "video", "voice", "document", "audio", "video_note"];
	const basePath = this.settings.newFilesLocation || this.settings.newNotesLocation || "";
	await createFolderIfNotExist(this.app.vault, basePath);
	let filePath: string | undefined;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let error: any;

	const messageDate = new Date(msg.date * 1000);
	const messageDateString = date2DateString(messageDate);
	const messageTimeString = date2TimeString(messageDate);

	try {
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
			const fileFullName = `${fileName} - ${messageDateString}${messageTimeString}${fileExtension}`;
			filePath = `${specificFolder}/${fileFullName}`;

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
			break;
		}
	} catch (e) {
		error = e;
	}

	// Handle message captions and append to Telegram.md if necessary
	if ((msg.caption && !(msg.caption === "")) || this.settings.appendAllToTelegramMd) {
		const captionMd = !error
			? `![](${filePath?.replace(/\s/g, "%20")})\n${msg.caption || ""}`
			: `[❌ error while handling file](${error})\n${msg.caption || ""}`;

		const formattedContent = await this.applyTemplate(this.settings.templateFileLocation, msg, captionMd);
		if (this.settings.appendAllToTelegramMd) {
			this.messageQueueToTelegramMd.push({ msg, formattedContent, error });
			return;
		} else if (msg.caption) {
			// Save caption as a separate note
			const noteLocation = this.settings.newNotesLocation || "";
			await createFolderIfNotExist(this.app.vault, noteLocation);
			const title = sanitizeFileName(msg.caption.slice(0, 20));
			let fileCaptionName = `${title} - ${messageDateString}${messageTimeString}.md`;
			let notePath = normalizePath(noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName);

			while (
				this.listOfNotePaths.includes(notePath) ||
				this.app.vault.getAbstractFileByPath(notePath) instanceof TFile
			) {
				const newMessageTimeString = date2TimeString(messageDate);
				fileCaptionName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
				notePath = normalizePath(noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName);
			}
			this.listOfNotePaths.push(notePath);
			await this.app.vault.create(notePath, formattedContent);
		}
	}

	await this.finalizeMessageProcessing(msg, error);
}

// show changes about new release
export async function ifNewRelaseThenShowChanges(this: TelegramSyncPlugin, msg: TelegramBot.Message) {
	const pluginVersionCode = pluginVersion.replace(/!/g, "");
	if (
		this.settings.pluginVersion &&
		this.settings.pluginVersion !== pluginVersionCode &&
		// warn user only when "!" sign is in pluginVersion
		pluginVersionCode != pluginVersion
	) {
		this.settings.pluginVersion = pluginVersionCode;
		this.saveSettings();
		const announcing = `<b>Telegrm Sync ${pluginVersionCode}</b>\n\n`;
		const newFeatures_ = `<u>New Features</u>${newFeatures}\n`;
		const bugsFixes_ = `<u>Bug Fixes</u>${bugFixes}\n`;
		const possibleRoadMap_ = `<u>Possible Road Map</u>${possibleRoadMap}\n`;
		const donation =
			"<b>If you like this plugin and are considering donating to support continued development, use the buttons below!</b>";
		const releaseNotes = announcing + newFeatures_ + bugsFixes_ + possibleRoadMap_ + donation;

		const options: SendMessageOptions = {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "🚀  Ð⟠na₮e crypto", url: cryptoDonationLink },
						{ text: "📖  Buy me a book", url: buyMeACoffeeLink },
					],
					[
						{ text: "☕  Ko-fi Donation", url: kofiLink },
						{ text: "💳  PayPal Donation", url: paypalLink },
					],
				],
			},
		};

		await this.bot?.sendMessage(msg.chat.id, releaseNotes, options);
	} else if (!this.settings.pluginVersion) {
		this.settings.pluginVersion = pluginVersionCode;
		this.saveSettings();
	}
}
