/* eslint-disable no-mixed-spaces-and-tabs */
import TelegramSyncPlugin from "../../../main";
import TelegramBot from "node-telegram-bot-api";
import { appendContentToNote, createFolderIfNotExist, defaultDelimiter, getUniqueFilePath } from "src/utils/fsUtils";
import * as release from "../../../../release-notes.mjs";
import { donationInlineKeyboard } from "./donation";
import { SendMessageOptions } from "node-telegram-bot-api";
import path from "path";
import * as Client from "../../user/client";
import { extension } from "mime-types";
import {
	applyFilesPathTemplate,
	applyNoteContentTemplate,
	applyNotePathTemplate,
	finalizeMessageProcessing,
} from "./processors";
import { ProgressBarType, _3MB, createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getFileObject } from "./getters";
import { TFile } from "obsidian";
import { enqueue } from "src/utils/queues";
import { _15sec, _1sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";
import { getMessageDistributionRule } from "./filterEvaluations";
import { MessageDistributionRule, getMessageDistributionRuleInfo } from "src/settings/messageDistribution";
import { getOffsetDate, unixTime2Date } from "src/utils/dateUtils";
import { addOriginalUserMsg, canUpdateProcessingDate } from "src/telegram/user/sync";

interface MediaGroup {
	id: string;
	notePath: string;
	initialMsg: TelegramBot.Message;
	mediaMessages: TelegramBot.Message[];
	error?: Error;
	filesPaths: string[];
}

const mediaGroups: MediaGroup[] = [];

let handleMediaGroupIntervalId: NodeJS.Timer | undefined;

export function clearHandleMediaGroupInterval() {
	clearInterval(handleMediaGroupIntervalId);
	handleMediaGroupIntervalId = undefined;
}

// handle all messages from Telegram
export async function handleMessage(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, isChannelPost = false) {
	if (!plugin.isBotConnected()) {
		plugin.setBotStatus("connected");
		plugin.lastPollingErrors = [];
	}

	// if user disconnected and should be connected then reconnect it
	if (!plugin.userConnected) await enqueue(plugin, plugin.restartTelegram, "user");

	const { fileObject, fileType } = getFileObject(msg);
	// skip system messages

	if (!msg.text && !fileObject) {
		displayAndLog(plugin, `System message skipped`, 0);
		return;
	}
	let fileInfo = "binary";
	if (fileType && fileObject)
		fileInfo = `${fileType} ${
			fileObject instanceof Array ? fileObject[0]?.file_unique_id : fileObject.file_unique_id
		}`;

	// Skip processing if the message is a "/start" command
	// https://github.com/soberhacker/obsidian-telegram-sync/issues/109
	if (msg.text === "/start") {
		return;
	}

	// Store topic name if "/topicName " command
	if (msg.text?.includes("/topicName")) {
		await plugin.settingsTab?.storeTopicName(msg);
		return;
	}

	addOriginalUserMsg(msg);

	let msgText = (msg.text || msg.caption || fileInfo).replace("\n", "..");

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	if ((msg as any).userMsg) {
		displayAndLog(plugin, `Message "${msgText}" skipped\nAlready processed before!`, 0);
		return;
	}

	const distributionRule = await getMessageDistributionRule(plugin, msg);
	if (msgText.length > 200) msgText = msgText.slice(0, 200) + "... (trimmed)";
	if (!distributionRule) {
		displayAndLog(plugin, `Message "${msgText}" skipped\nNo matched distribution rule!`, 0);
		return;
	} else {
		const ruleInfo = getMessageDistributionRuleInfo(distributionRule);
		displayAndLog(plugin, `Message: ${msgText}\nDistribution rule: ${JSON.stringify(ruleInfo)}`, 0);
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
		if (!msg.text && distributionRule.filePathTemplate) await handleFiles(plugin, msg, distributionRule);
		else await handleMessageText(plugin, msg, distributionRule);
		!isChannelPost && (await enqueue(ifNewReleaseThenShowChanges, plugin, msg));
	} catch (error) {
		await displayAndLogError(plugin, error, "", "", msg, _15sec);
	} finally {
		--plugin.messagesLeftCnt;
		if (plugin.messagesLeftCnt == 0 && canUpdateProcessingDate) {
			plugin.settings.processOldMessagesSettings.lastProcessingDate = getOffsetDate();
			await plugin.saveSettings();
		}
	}
}

export async function handleMessageText(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	distributionRule: MessageDistributionRule,
) {
	const formattedContent = await applyNoteContentTemplate(plugin, distributionRule.templateFilePath, msg);
	const notePath = await applyNotePathTemplate(plugin, distributionRule.notePathTemplate, msg);

	let noteFolderPath = path.dirname(notePath);
	if (noteFolderPath != ".") createFolderIfNotExist(plugin.app.vault, noteFolderPath);
	else noteFolderPath = "";

	await enqueue(
		appendContentToNote,
		plugin.app.vault,
		notePath,
		formattedContent,
		distributionRule.heading,
		plugin.settings.defaultMessageDelimiter ? defaultDelimiter : "",
		distributionRule.reversedOrder,
	);
	await finalizeMessageProcessing(plugin, msg);
}

async function createNoteContent(
	plugin: TelegramSyncPlugin,
	notePath: string,
	msg: TelegramBot.Message,
	distributionRule: MessageDistributionRule,
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

	return await applyNoteContentTemplate(plugin, distributionRule.templateFilePath, msg, filesLinks);
}

// Handle files received in messages
export async function handleFiles(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	distributionRule: MessageDistributionRule,
) {
	if (!plugin.bot) return;
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
			const chatId = msg.chat.id < 0 ? msg.chat.id.toString().slice(4) : msg.chat.id.toString();
			telegramFileName =
				telegramFileName || fileLink?.split("/").pop()?.replace(/file/, `${fileType}_${chatId}`) || "";
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
				totalBytes > _3MB ? await createProgressBar(plugin.bot, msg, ProgressBarType.DOWNLOADING) : undefined;
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
			const chatId = msg.chat.id < 0 ? msg.chat.id.toString().slice(4) : msg.chat.id.toString();
			telegramFileName = telegramFileName || `${fileType}_${chatId}_${msg.message_id}`;
			error = undefined;
		}
		telegramFileName = (msg.document && msg.document.file_name) || telegramFileName;
		const fileExtension =
			path.extname(telegramFileName).replace(".", "") || extension(fileObject.mime_type) || "file";
		const fileName = path.basename(telegramFileName, "." + fileExtension);

		filePath = await applyFilesPathTemplate(
			plugin,
			distributionRule.filePathTemplate,
			msg,
			fileType,
			fileExtension,
			fileName,
		);

		filePath = await enqueue(
			getUniqueFilePath,
			plugin.app.vault,
			plugin.createdFilePaths,
			filePath,
			unixTime2Date(msg.date, msg.message_id),
			fileExtension,
		);
		await plugin.app.vault.createBinary(filePath, fileByteArray);
	} catch (e) {
		if (error) (error as Error).message = (error as Error).message + " | " + e;
		else error = e;
	}

	if (msg.caption || distributionRule.templateFilePath)
		await appendFileToNote(plugin, msg, distributionRule, filePath, error);

	if (msg.media_group_id && !handleMediaGroupIntervalId)
		handleMediaGroupIntervalId = setInterval(
			async () => await enqueue(handleMediaGroup, plugin, distributionRule),
			_1sec,
		);
	else if (!msg.media_group_id) await finalizeMessageProcessing(plugin, msg, error);
}

async function handleMediaGroup(plugin: TelegramSyncPlugin, distributionRule: MessageDistributionRule) {
	if (mediaGroups.length > 0 && plugin.messagesLeftCnt == 0) {
		for (const mg of mediaGroups) {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(mg.initialMsg as any).mediaMessages = mg.mediaMessages;
				const noteContent = await createNoteContent(
					plugin,
					mg.notePath,
					mg.initialMsg,
					distributionRule,
					mg.filesPaths,
					mg.error,
				);
				await enqueue(
					appendContentToNote,
					plugin.app.vault,
					mg.notePath,
					noteContent,
					distributionRule.heading,
					plugin.settings.defaultMessageDelimiter ? defaultDelimiter : "",
					distributionRule.reversedOrder,
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
	distributionRule: MessageDistributionRule,
	filePath: string,
	error?: Error,
) {
	let mediaGroup = mediaGroups.find((mg) => mg.id == msg.media_group_id);
	if (mediaGroup) {
		mediaGroup.filesPaths.push(filePath);
		if (msg.caption || !mediaGroup.initialMsg) mediaGroup.initialMsg = msg;
		mediaGroup.mediaMessages.push(msg);
		if (error) mediaGroup.error = error;
		return;
	}

	const notePath = await applyNotePathTemplate(plugin, distributionRule.notePathTemplate, msg);

	let noteFolderPath = path.dirname(notePath);
	if (noteFolderPath != ".") createFolderIfNotExist(plugin.app.vault, noteFolderPath);
	else noteFolderPath = "";

	if (msg.media_group_id) {
		mediaGroup = {
			id: msg.media_group_id,
			notePath,
			initialMsg: msg,
			mediaMessages: [],
			error: error,
			filesPaths: [filePath],
		};
		mediaGroups.push(mediaGroup);
		return;
	}

	const noteContent = await createNoteContent(plugin, notePath, msg, distributionRule, [filePath], error);

	await enqueue(
		appendContentToNote,
		plugin.app.vault,
		notePath,
		noteContent,
		distributionRule.heading,
		plugin.settings.defaultMessageDelimiter ? defaultDelimiter : "",
		distributionRule.reversedOrder,
	);
}

// show changes about new release
export async function ifNewReleaseThenShowChanges(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	if (plugin.settings.pluginVersion == release.releaseVersion) return;

	plugin.settings.pluginVersion = release.releaseVersion;
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
