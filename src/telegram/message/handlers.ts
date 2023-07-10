import { TFile, normalizePath } from "obsidian";
import TelegramSyncPlugin from "../../main";
import TelegramBot from "node-telegram-bot-api";
import { date2DateString, date2TimeString } from "src/utils/dateUtils";
import { createFolderIfNotExist, sanitizeFileName } from "src/utils/fsUtils";
import * as release from "../../../release-notes.mjs";
import { buyMeACoffeeLink, cryptoDonationLink, kofiLink, paypalLink } from "../../settings/donation";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";
import * as GramJs from "../GramJs/client";
import { extension } from "mime-types";
import { applyNoteContentTemplate, finalizeMessageProcessing, getTelegramMdPath } from "./processors";
import { createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getFileObject } from "./getters";

// handle all messages from Telegram
export async function handleMessage(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	let formattedContent = "";

	// save topic name and skip handling other data
	if (msg.forum_topic_created || msg.forum_topic_edited) {
		const topicName = {
			name: msg.forum_topic_created?.name || msg.forum_topic_edited?.name || "",
			chatId: msg.chat.id,
			topicId: msg.message_thread_id || 1,
		};
		const topicNameIndex = plugin.settings.topicNames.findIndex(
			(tn) => tn.chatId == msg.chat.id && tn.topicId == msg.message_thread_id
		);
		if (topicNameIndex == -1) {
			plugin.settings.topicNames.push(topicName);
			await plugin.saveSettings();
		} else if (plugin.settings.topicNames[topicNameIndex].name != topicName.name) {
			plugin.settings.topicNames[topicNameIndex].name = topicName.name;
			await plugin.saveSettings();
		}
		return;
	}

	if (!msg.text) {
		await handleFiles(plugin, msg);
		return;
	}

	// Check if message has been sended by allowed usernames
	const telegramUserName = msg.from?.username ?? "";
	const allowedChatFromUsernames = plugin.settings.allowedChatFromUsernames;

	if (!telegramUserName || !allowedChatFromUsernames.includes(telegramUserName)) {
		plugin.bot?.sendMessage(
			msg.chat.id,
			`Access denied. Add your username ${telegramUserName} in the plugin setting "Allowed Chat From Usernames".`,
			{ reply_to_message_id: msg.message_id }
		);
		return;
	}

	const rawText = msg.text;
	const location = plugin.settings.newNotesLocation || "";
	await createFolderIfNotExist(plugin.app.vault, location);

	const messageDate = new Date(msg.date * 1000);
	const messageDateString = date2DateString(messageDate);
	const messageTimeString = date2TimeString(messageDate);

	formattedContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg);

	const appendAllToTelegramMd = plugin.settings.appendAllToTelegramMd;

	if (appendAllToTelegramMd) {
		plugin.messageQueueToTelegramMd.push({ msg, formattedContent });
		return;
	} else {
		const title = sanitizeFileName(rawText.slice(0, 30));
		let fileName = `${title} - ${messageDateString}${messageTimeString}.md`;
		let notePath = normalizePath(location ? `${location}/${fileName}` : fileName);
		while (
			plugin.listOfNotePaths.includes(notePath) ||
			plugin.app.vault.getAbstractFileByPath(notePath) instanceof TFile
		) {
			const newMessageTimeString = date2TimeString(messageDate);
			fileName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
			notePath = normalizePath(location ? `${location}/${fileName}` : fileName);
		}
		plugin.listOfNotePaths.push(notePath);
		await plugin.app.vault.create(notePath, formattedContent);
		await finalizeMessageProcessing(plugin, msg);
	}
}

function createMarkdownLink(plugin: TelegramSyncPlugin, filePath: string, notePath: string) {
	const file = plugin.app.vault.getAbstractFileByPath(filePath);
	return plugin.app.fileManager.generateMarkdownLink(file, notePath);
}

// Handle files received in messages
export async function handleFiles(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (!plugin.bot) return;

	const basePath = plugin.settings.newFilesLocation || plugin.settings.newNotesLocation || "";
	await createFolderIfNotExist(plugin.app.vault, basePath);
	let filePath = "";
	let telegramFileName = "";
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let error: any;

	const messageDate = new Date(msg.date * 1000);
	const messageDateString = date2DateString(messageDate);
	const messageTimeString = date2TimeString(messageDate);

	try {
		// Iterate through each file type
		const { fileType, fileObject } = getFileObject(msg);
		if (!fileType || !fileObject) {
			throw new Error("Can't get file object from the message!");
		}
		const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
		const fileId = fileObjectToUse.file_id;
		telegramFileName = ("file_name" in fileObjectToUse && fileObjectToUse.file_name) || "";
		let fileByteArray: Uint8Array;
		try {
			const fileLink = await plugin.bot.getFileLink(fileId);
			telegramFileName =
				telegramFileName || fileLink?.split("/").pop()?.replace(/file/, `${fileType}_${msg.chat.id}`) || "";
			const fileStream = plugin.bot.getFileStream(fileId);
			const fileChunks: Uint8Array[] = [];

			if (!fileStream) {
				return;
			}

			const progressBarMessage = await createProgressBar(plugin.bot, msg, "downloading");

			const totalBytes = fileObjectToUse.file_size;
			let receivedBytes = 0;
			let stage = 0;
			for await (const chunk of fileStream) {
				fileChunks.push(new Uint8Array(chunk));
				receivedBytes += chunk.length;
				stage = await updateProgressBar(plugin.bot, msg, progressBarMessage, totalBytes, receivedBytes, stage);
			}

			await deleteProgressBar(plugin.bot, msg, progressBarMessage);

			fileByteArray = new Uint8Array(
				fileChunks.reduce<number[]>((acc, val) => {
					acc.push(...val);
					return acc;
				}, [])
			);
		} catch (e) {
			if (e.message == "ETELEGRAM: 400 Bad Request: file is too big") {
				const media = await GramJs.downloadMedia(
					plugin.bot,
					msg,
					fileId,
					fileObjectToUse.file_size,
					plugin.botUser
				);
				fileByteArray = media instanceof Buffer ? media : Buffer.alloc(0);
				telegramFileName = telegramFileName || `${fileType}_${msg.chat.id}_${msg.message_id}`;
			} else {
				throw e;
			}
		}
		telegramFileName = (msg.document && msg.document.file_name) || telegramFileName;
		const fileExtension = path.extname(telegramFileName) || `.${extension(fileObject.mime_type)}`;
		const fileName = path.basename(telegramFileName, fileExtension);

		// Create a specific folder for each file type
		const specificFolder = `${basePath}/${fileType}s`;
		await createFolderIfNotExist(plugin.app.vault, specificFolder);
		// Format the file name and path
		const fileFullName = `${fileName} - ${messageDateString}${messageTimeString}${fileExtension}`;
		filePath = `${specificFolder}/${fileFullName}`;

		await plugin.app.vault.createBinary(filePath, fileByteArray);
	} catch (e) {
		error = e;
	}

	// exit if only file is needed
	if (!plugin.settings.appendAllToTelegramMd && !plugin.settings.templateFileLocation) {
		await finalizeMessageProcessing(plugin, msg, error);
		return;
	}

	if (plugin.settings.appendAllToTelegramMd) {
		const fileLink = !error ? createMarkdownLink(plugin, filePath, getTelegramMdPath(plugin)) : `[❌ error while handling file](${error})`;

		const noteContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg, fileLink);

		plugin.messageQueueToTelegramMd.push({ msg, formattedContent: noteContent, error });
		return;
	} else if (msg.caption || telegramFileName) {
		// Save caption as a separate note
		const noteLocation = plugin.settings.newNotesLocation || "";
		await createFolderIfNotExist(plugin.app.vault, noteLocation);
		const title = sanitizeFileName((msg.caption || telegramFileName).slice(0, 30));
		let noteFileName = `${title} - ${messageDateString}${messageTimeString}.md`;
		let notePath = normalizePath(noteLocation ? `${noteLocation}/${noteFileName}` : noteFileName);

		while (
			plugin.listOfNotePaths.includes(notePath) ||
			plugin.app.vault.getAbstractFileByPath(notePath) instanceof TFile
		) {
			const newMessageTimeString = date2TimeString(messageDate);
			noteFileName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
			notePath = normalizePath(noteLocation ? `${noteLocation}/${noteFileName}` : noteFileName);
		}
		plugin.listOfNotePaths.push(notePath);

		const fileLink = !error ? createMarkdownLink(plugin, filePath, notePath) : `[❌ error while handling file](${error})`;

		const noteContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg, fileLink);

		await plugin.app.vault.create(notePath, noteContent);
	}

	await finalizeMessageProcessing(plugin, msg, error);
}

// show changes about new release
export async function ifNewRelaseThenShowChanges(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (plugin.settings.pluginVersion && plugin.settings.pluginVersion !== release.version && release.showInTelegram) {
		plugin.settings.pluginVersion = release.version;
		await plugin.saveSettings();
		const announcing = `<b>Telegrm Sync ${release.version}</b>\n\n`;
		const newFeatures_ = `<u>New Features</u>${release.newFeatures}\n`;
		const bugsFixes_ = `<u>Bug Fixes</u>${release.bugFixes}\n`;
		const possibleRoadMap_ = `<u>Possible Road Map</u>${release.possibleRoadMap}\n`;
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

		await plugin.bot?.sendMessage(msg.chat.id, releaseNotes, options);
	} else if (!plugin.settings.pluginVersion) {
		plugin.settings.pluginVersion = release.version;
		await plugin.saveSettings();
	}
}
