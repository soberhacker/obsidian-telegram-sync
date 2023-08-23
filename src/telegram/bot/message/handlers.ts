/* eslint-disable no-mixed-spaces-and-tabs */
import TelegramSyncPlugin from "../../../main";
import TelegramBot from "node-telegram-bot-api";
import { appendContentToNote, createFolderIfNotExist, getTelegramMdPath, getUniqueFilePath } from "src/utils/fsUtils";
import * as release from "../../../../release-notes.mjs";
import { inlineKeyboard as donationInlineKeyboard } from "../../../settings/donation";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";
import * as Client from "../../user/client";
import { extension } from "mime-types";
import { applyNoteContentTemplate, finalizeMessageProcessing } from "./processors";
import { ProgressBarType, _3MB, createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getFileObject, getMediaGroupFileName } from "./getters";
import { TFile } from "obsidian";
import { enqueue, enqueueByCondition } from "src/utils/queues";
import { _15sec, _1sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";

export interface MediaGroup {
	id: string;
	notePath: string;
	initialMsg: TelegramBot.Message;
	error?: Error;
	filesPaths: string[];
}

const mediaGroups: MediaGroup[] = [];

let handleMediaGroupIntervalId: NodeJS.Timer | undefined;

export function clearHandleMediaGroupInterval() {
	clearInterval(handleMediaGroupIntervalId);
	handleMediaGroupIntervalId = undefined;
}

export async function handleMessageOrPost(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	msgType: "post" | "message",
) {
	if (!plugin.isBotConnected()) {
		plugin.setBotStatus("connected");
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
			{ reply_to_message_id: msg.message_id },
		);
		return;
	}

	// save topic name and skip handling other data
	if (msg.forum_topic_created || msg.forum_topic_edited) {
		const topicName = {
			name: msg.forum_topic_created?.name || msg.forum_topic_edited?.name || "",
			chatId: msg.chat.id,
			topicId: msg.message_thread_id || 1,
		};
		const topicNameIndex = plugin.settings.topicNames.findIndex(
			(tn) => tn.chatId == msg.chat.id && tn.topicId == msg.message_thread_id,
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

	++plugin.messagesLeftCnt;
	try {
		if (!msg.text) plugin.settings.needToSaveFiles && (await handleFiles(plugin, msg));
		else await handleMessage(plugin, msg);
		msgType == "message" && (await enqueue(ifNewReleaseThenShowChanges, plugin, msg));
	} catch (error) {
		await displayAndLogError(plugin, error, "", "", msg, _15sec);
	} finally {
		--plugin.messagesLeftCnt;
	}
}

// handle all messages from Telegram
export async function handleMessage(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	let formattedContent = "";

	formattedContent = await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg);
	const appendAllToTelegramMd = plugin.settings.appendAllToTelegramMd;
	const notePath = appendAllToTelegramMd
		? getTelegramMdPath(plugin.app.vault, plugin.settings.newNotesLocation)
		: await getUniqueFilePath(
				plugin.app.vault,
				plugin.listOfNotePaths,
				plugin.settings.newNotesLocation,
				msg.text || "",
				"md",
				msg.date,
		  );

	await enqueueByCondition(appendAllToTelegramMd, appendContentToNote, plugin.app.vault, notePath, formattedContent);
	await finalizeMessageProcessing(plugin, msg);
}

async function createNoteContent(
	plugin: TelegramSyncPlugin,
	notePath: string,
	msg: TelegramBot.Message,
	filesPaths: string[] = [],
	error?: Error,
) {
	const filesLinks: string[] = [];

	if (!error) {
		filesPaths.forEach((fp) => {
			const filePath = plugin.app.vault.getAbstractFileByPath(fp) as TFile;
			filesLinks.push(plugin.app.fileManager.generateMarkdownLink(filePath, notePath));
		});
	} else {
		filesLinks.push(`[❌ error while handling file](${error})`);
	}

	return await applyNoteContentTemplate(plugin, plugin.settings.templateFileLocation, msg, filesLinks);
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
						stage,
					);
				}
			} finally {
				await deleteProgressBar(plugin.bot, msg, progressBarMessage);
			}

			fileByteArray = new Uint8Array(
				fileChunks.reduce<number[]>((acc, val) => {
					acc.push(...val);
					return acc;
				}, []),
			);
		} catch (e) {
			error = e;
			const media = await Client.downloadMedia(
				plugin.bot,
				msg,
				fileId,
				fileObjectToUse.file_size,
				plugin.botUser,
			);
			fileByteArray = media instanceof Buffer ? media : Buffer.alloc(0);
			telegramFileName = telegramFileName || `${fileType}_${msg.chat.id}_${msg.message_id}`;
			error = undefined;
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
			msg.date,
		);
		await plugin.app.vault.createBinary(filePath, fileByteArray);
	} catch (e) {
		if (error) (error as Error).message = (error as Error).message + " | " + e;
		else error = e;
	}

	if (msg.caption || plugin.settings.appendAllToTelegramMd || plugin.settings.templateFileLocation)
		await appendFileToNote(plugin, msg, filePath, telegramFileName, error);

	if (msg.media_group_id && !handleMediaGroupIntervalId)
		handleMediaGroupIntervalId = setInterval(async () => await enqueue(handleMediaGroup, plugin), _1sec);
	else if (!msg.media_group_id) await finalizeMessageProcessing(plugin, msg, error);
}

async function handleMediaGroup(plugin: TelegramSyncPlugin) {
	if (mediaGroups.length > 0 && plugin.messagesLeftCnt == 0) {
		for (const mg of mediaGroups) {
			try {
				const noteContent = await createNoteContent(
					plugin,
					mg.notePath,
					mg.initialMsg,
					mg.filesPaths,
					mg.error,
				);
				await enqueueByCondition(
					plugin.settings.appendAllToTelegramMd,
					appendContentToNote,
					plugin.app.vault,
					mg.notePath,
					noteContent,
				);
				await finalizeMessageProcessing(plugin, mg.initialMsg, mg.error);
			} catch (e) {
				displayAndLogError(plugin, e, "", "", mg.initialMsg, 0);
			} finally {
				mediaGroups.remove(mg);
			}
		}
	}
}

async function appendFileToNote(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	filePath: string,
	fileName: string,
	error?: Error,
) {
	let mediaGroup = mediaGroups.find((mg) => mg.id == msg.media_group_id);
	if (mediaGroup) {
		mediaGroup.filesPaths.push(filePath);
		if (msg.caption || !mediaGroup.initialMsg) mediaGroup.initialMsg = msg;
		if (error) mediaGroup.error = error;
		return;
	}
	const appendAllToTelegramMd = plugin.settings.appendAllToTelegramMd;
	const notePath = appendAllToTelegramMd
		? getTelegramMdPath(plugin.app.vault, plugin.settings.newNotesLocation)
		: await getUniqueFilePath(
				plugin.app.vault,
				plugin.listOfNotePaths,
				plugin.settings.newNotesLocation,
				msg.caption || getMediaGroupFileName(msg) || fileName,
				"md",
				msg.date,
		  );

	if (msg.media_group_id) {
		mediaGroup = {
			id: msg.media_group_id,
			notePath,
			initialMsg: msg,
			error: error,
			filesPaths: [filePath],
		};
		mediaGroups.push(mediaGroup);
		return;
	}

	const noteContent = await createNoteContent(plugin, notePath, msg, [filePath], error);

	await enqueueByCondition(appendAllToTelegramMd, appendContentToNote, plugin.app.vault, notePath, noteContent);
}

// show changes about new release
export async function ifNewReleaseThenShowChanges(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (plugin.settings.pluginVersion == release.version) return;

	plugin.settings.pluginVersion = release.version;
	await plugin.saveSettings();

	if (plugin.userConnected && (await Client.subscribedOnInsiderChannel())) return;

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
}
