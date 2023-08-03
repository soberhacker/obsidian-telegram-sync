import TelegramSyncPlugin from "../../../main";
import TelegramBot from "node-telegram-bot-api";
import { createFolderIfNotExist, getTelegramMdPath, getUniqueFilePath } from "src/utils/fsUtils";
import * as release from "../../../../release-notes.mjs";
import { inlineKeyboard as donationInlineKeyboard } from "../../../settings/donation";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";
import * as Client from "../../user/client";
import { extension } from "mime-types";
import { appendMessageToTelegramMd, applyNoteContentTemplate, finalizeMessageProcessing } from "./processors";
import { ProgressBarType, _3MB, createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getFileObject } from "./getters";
import { TFile } from "obsidian";
import { enqueue } from "src/utils/queues";
import { _15sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";

export async function handleMessageOrPost(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	msgType: "post" | "message"
) {
	if (!plugin.botConnected) {
		plugin.botConnected = true;
		plugin.lastPollingErrors = [];
	}

	// if user disconnected and should be connected then reconnect it
	if (!plugin.userConnected) await enqueue(plugin, plugin.restartTelegram, "user");

	const { fileObject, fileType } = getFileObject(msg);
	// skip system messages

	if (!msg.text && !fileType) {
		displayAndLog(plugin, `Got a system message from Telegram Bot`, 0);
		return;
	}
	let fileInfo = "binary";
	if (fileType && fileObject)
		fileInfo = `${fileType} ${
			fileObject instanceof Array ? fileObject[0]?.file_unique_id : fileObject.file_unique_id
		}`;

	displayAndLog(plugin, `Got a message from Telegram Bot: ${msg.text || fileInfo}`, 0);

	// Skip processing if the message is a "/start" command
	// https://github.com/soberhacker/obsidian-telegram-sync/issues/109
	if (msg.text === "/start") {
		return;
	}

	// Store topic name if "/topicName " command
	if (msg.text?.includes("/topicName")) {
		await plugin.settingsTab.storeTopicName(msg);
		return;
	}

	// Check if message has been sended by allowed users or chats
	const telegramUserName = msg.from?.username ?? "";
	const allowedChats = plugin.settings.allowedChats;

	if (!allowedChats.includes(telegramUserName) && !allowedChats.includes(msg.chat.id.toString())) {
		const telegramUserNameFull = telegramUserName ? `your username "${telegramUserName}" or` : "";
		plugin.bot?.sendMessage(
			msg.chat.id,
			`Access denied. Add ${telegramUserNameFull} this chat id "${msg.chat.id}" in the plugin setting "Allowed Chats".`,
			{ reply_to_message_id: msg.message_id }
		);
		return;
	}

	try {
		await handleMessage(plugin, msg);
		msgType == "message" && (await enqueue(ifNewReleaseThenShowChanges, plugin, msg));
	} catch (error) {
		await displayAndLogError(plugin, error, "", "", msg, _15sec);
	}
}

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

	formattedContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg);

	const appendAllToTelegramMd = plugin.settings.appendAllToTelegramMd;

	if (appendAllToTelegramMd) {
		await enqueue(appendMessageToTelegramMd, plugin, msg, formattedContent);
		return;
	}

	const notePath = await getUniqueFilePath(
		plugin.app.vault,
		plugin.listOfNotePaths,
		plugin.settings.newNotesLocation,
		msg.text || "",
		"md",
		msg.date
	);
	await plugin.app.vault.create(notePath, formattedContent);
	await finalizeMessageProcessing(plugin, msg);
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
			try {
				for await (const chunk of fileStream) {
					fileChunks.push(new Uint8Array(chunk));
					receivedBytes += chunk.length;
					stage = await updateProgressBar(
						plugin.bot,
						msg,
						progressBarMessage,
						totalBytes,
						receivedBytes,
						stage
					);
				}
			} finally {
				await deleteProgressBar(plugin.bot, msg, progressBarMessage);
			}

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
		await enqueue(appendMessageToTelegramMd, plugin, msg, noteContent, error);
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
	if (plugin.settings.pluginVersion == release.version) return;

	if (plugin.settings.pluginVersion && release.showNewFeatures) {
		const options: SendMessageOptions = {
			parse_mode: "HTML",
			reply_markup: { inline_keyboard: donationInlineKeyboard },
		};

		await plugin.bot?.sendMessage(msg.chat.id, release.notes, options);
	}

	if (plugin.settings.pluginVersion && release.showBreakingChanges && !plugin.userConnected) {
		await plugin.bot?.sendMessage(msg.chat.id, release.breakingChanges, { parse_mode: "HTML" });
	}

	plugin.settings.pluginVersion = release.version;
	await plugin.saveSettings();
}