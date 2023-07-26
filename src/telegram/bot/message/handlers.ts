import TelegramSyncPlugin from "../../../main";
import TelegramBot from "node-telegram-bot-api";
import { createFolderIfNotExist, getTelegramMdPath, getUniqueFilePath } from "src/utils/fsUtils";
import * as release from "../../../../release-notes.mjs";
import { buyMeACoffeeLink, boostyLink, kofiLink, paypalLink } from "../../../settings/donation";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";
import * as Client from "../../user/client";
import { extension } from "mime-types";
import { applyNoteContentTemplate, finalizeMessageProcessing } from "./processors";
import { ProgressBarType, _3MB, createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getFileObject } from "./getters";
import { TFile } from "obsidian";

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

	if (!msg.text && plugin.settings.needToSaveFiles) {
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

	formattedContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg);

	const appendAllToTelegramMd = plugin.settings.appendAllToTelegramMd;

	if (appendAllToTelegramMd) {
		plugin.messageQueueToTelegramMd.push({ msg, formattedContent });
		return;
	} else {
		const notePath = await getUniqueFilePath(
			plugin.app.vault,
			plugin.listOfNotePaths,
			plugin.settings.newNotesLocation,
			msg.text,
			"md",
			msg.date
		);
		await plugin.app.vault.create(notePath, formattedContent);
		await finalizeMessageProcessing(plugin, msg);
	}
}

async function createNoteContent(
	plugin: TelegramSyncPlugin,
	filePath: string,
	notePath: string,
	msg: TelegramBot.Message,
	error?: Error
) {
	let fileLink: string;

	if (!error) {
		const file = plugin.app.vault.getAbstractFileByPath(filePath) as TFile;
		fileLink = plugin.app.fileManager.generateMarkdownLink(file, notePath);
	} else {
		fileLink = `[❌ error while handling file](${error})`;
	}

	return await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg, fileLink);
}

// Handle files received in messages
export async function handleFiles(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (!plugin.bot) return;

	const basePath = plugin.settings.newFilesLocation || plugin.settings.newNotesLocation || "";
	await createFolderIfNotExist(plugin.app.vault, basePath);
	let filePath = "";
	let telegramFileName = "";
	let error: Error | undefined = undefined;

	try {
		// Iterate through each file type
		const { fileType, fileObject } = getFileObject(msg);

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

			const totalBytes = fileObjectToUse.file_size;
			let receivedBytes = 0;

			let stage = 0;
			// show progress bar only if file size > 3MB
			const progressBarMessage =
				totalBytes > _3MB ? await createProgressBar(plugin.bot, msg, ProgressBarType.downloading) : undefined;

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
				const media = await Client.downloadMedia(
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
		// Format the file name and path
		filePath = await getUniqueFilePath(
			plugin.app.vault,
			plugin.listOfNotePaths,
			specificFolder,
			fileName,
			fileExtension,
			msg.date
		);
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
		const noteContent = await createNoteContent(
			plugin,
			filePath,
			getTelegramMdPath(plugin.app.vault, plugin.settings.newNotesLocation),
			msg,
			error
		);
		plugin.messageQueueToTelegramMd.push({ msg, formattedContent: noteContent, error });
		return;
	} else if (msg.caption || telegramFileName) {
		// Save caption as a separate note
		const notePath = await getUniqueFilePath(
			plugin.app.vault,
			plugin.listOfNotePaths,
			plugin.settings.newNotesLocation,
			msg.caption || telegramFileName,
			"md",
			msg.date
		);

		const noteContent = await createNoteContent(plugin, filePath, notePath, msg, error);
		await plugin.app.vault.create(notePath, noteContent);
	}

	await finalizeMessageProcessing(plugin, msg, error);
}

// show changes about new release
export async function ifNewReleaseThenShowChanges(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (plugin.settings.pluginVersion && plugin.settings.pluginVersion !== release.version && release.showInTelegram) {
		plugin.settings.pluginVersion = release.version;
		await plugin.saveSettings();

		const options: SendMessageOptions = {
			parse_mode: "HTML",
			reply_markup: {
				inline_keyboard: [
					[
						{ text: "⚡  Boosty", url: boostyLink },
						{ text: "☕  Buy me a coffee", url: buyMeACoffeeLink },
					],
					[
						{ text: "💰  Ko-fi Donation", url: kofiLink },
						{ text: "💳  PayPal Donation", url: paypalLink },
					],
				],
			},
		};

		await plugin.bot?.sendMessage(msg.chat.id, release.releaseNotes, options);
	} else if (!plugin.settings.pluginVersion) {
		plugin.settings.pluginVersion = release.version;
		await plugin.saveSettings();
	}
}
