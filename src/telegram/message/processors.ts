import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "../../main";
import { getChatLink, getForwardFromLink, getReplyMessageId, getTopicLink, getUrl, getUserLink } from "./getters";
import { createFolderIfNotExist } from "src/utils/fsUtils";
import { TFile, normalizePath } from "obsidian";
import { formatDateTime } from "../../utils/dateUtils";
import { _15sec, _1h, _5sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";
import { ProgressBarType, createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { convertMessageTextToMarkdown, escapeRegExp } from "./convertToMarkdown";
import * as GramJs from "../GramJs/client";

// Delete a message or send a confirmation reply based on settings and message age
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function finalizeMessageProcessing(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, error?: any) {
	if (error) await displayAndLogError(plugin, error, msg, _5sec);
	if (error || !plugin.bot) {
		return;
	}

	const currentTime = new Date();
	const messageTime = new Date(msg.date * 1000);
	const timeDifference = currentTime.getTime() - messageTime.getTime();
	const hoursDifference = timeDifference / _1h;

	if (plugin.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
		// Send the initial progress bar
		const progressBarMessage = await createProgressBar(plugin.bot, msg, ProgressBarType.deleting);

		// Update the progress bar during the delay
		let stage = 0;
		for (let i = 1; i <= 10; i++) {
			await new Promise((resolve) => setTimeout(resolve, 50)); // 50 ms delay between updates
			stage = await updateProgressBar(plugin.bot, msg, progressBarMessage, 10, i, stage);
		}

		await plugin.bot?.deleteMessage(msg.chat.id, msg.message_id);
		await deleteProgressBar(plugin.bot, msg, progressBarMessage);
	} else {
		let needReply = true;
		let error = "";
		try {
			if (plugin.userConnected && plugin.botUser) {
				await GramJs.syncSendReaction(plugin.botUser, msg);
				needReply = false;
			}
		} catch (e) {
			error = `\n\nCan't "like" the message, because ${e}`;
		}
		if (needReply) {
			await plugin.bot?.sendMessage(msg.chat.id, "...✅..." + error, { reply_to_message_id: msg.message_id });
		}
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

	const telegramMdPath = getTelegramMdPath(plugin);
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
export async function applyNoteContentTemplate(
	plugin: TelegramSyncPlugin,
	templatePath: string,
	msg: TelegramBot.Message,
	fileLink?: string
): Promise<string> {
	let templateContent = "";
	try {
		if (templatePath) {
			const templateFile = plugin.app.vault.getAbstractFileByPath(normalizePath(templatePath)) as TFile;
			templateContent = await plugin.app.vault.read(templateFile);
		}
	} catch (e) {
		throw new Error(`Template "${templatePath}" not found! ${e}`);
	}

	const textContentMd = await convertMessageTextToMarkdown(msg);
	// Check if the message is forwarded and extract the required information
	const forwardFromLink = getForwardFromLink(msg);
	const fullContentMd =
		(forwardFromLink ? `**Forwarded from ${forwardFromLink}**\n\n` : "") +
		(fileLink ? fileLink + "\n\n" : "") +
		textContentMd;

	if (!templateContent) {
		return fullContentMd;
	}

	let voiceTranscript = "";
	if (templateContent.includes("{{voiceTranscript")) {
		voiceTranscript = await GramJs.transcribeAudio(msg, await plugin.getBotUser(msg));
	}

	const messageDateTime = new Date(msg.date * 1000);
	const creationDateTime = msg.forward_date ? new Date(msg.forward_date * 1000) : messageDateTime;

	const dateTimeNow = new Date();
	const itemsForReplacing: [string, string][] = [];

	const lines = templateContent.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.includes("{{content")) {
			lines[i] = pasteText(plugin, "content", line, fullContentMd, textContentMd);
		}

		if (line.includes("{{voiceTranscript")) {
			lines[i] = pasteText(plugin, "voiceTranscript", line, voiceTranscript, voiceTranscript);
		}
	}
	let proccessedContent = lines.join("\n");

	proccessedContent = proccessedContent
		.replace(/{{file}}/g, fileLink || "")
		.replace(/{{file:link}}/g, fileLink?.startsWith("!") ? fileLink.slice(1) : fileLink || "")
		.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{forwardFrom}}/g, forwardFromLink)
		.replace(/{{user}}/g, getUserLink(msg)) // link to the user who sent the message
		.replace(/{{userId}}/g, msg.from?.id.toString() || msg.message_id.toString()) // id of the user who sent the message
		.replace(/{{chat}}/g, getChatLink(msg)) // link to the chat with the message
		.replace(/{{chatId}}/g, msg.chat.id.toString()) // id of the chat with the message
		.replace(/{{topic}}/g, await getTopicLink(plugin, msg)) // link to the topic with the message
		.replace(
			/{{topicId}}/g,
			(msg.chat.is_forum && (msg.message_thread_id || msg.reply_to_message?.message_thread_id || 1).toString()) ||
				""
		) // head message id representing the topic
		.replace(/{{messageId}}/g, msg.message_id.toString())
		.replace(/{{replyMessageId}}/g, getReplyMessageId(msg))
		.replace(/{{url1}}/g, getUrl(msg)) // fisrt url from the message
		.replace(/{{url1:preview(.*?)}}/g, (_, height: string) => {
			let linkPreview = "";
			const url1 = getUrl(msg);
			if (url1) {
				if (!height || Number.isInteger(parseFloat(height))) {
					linkPreview = `<iframe width="100%" height="${height || 250}" src="${url1}"></iframe>`;
				} else {
					displayAndLog(plugin, `Template variable {{url1:preview${height}}} isn't supported!`, _15sec);
				}
			}
			return linkPreview;
		}) // preview for first url from the message
		.replace(/{{creationDate:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)) // date, when the message was created
		.replace(/{{creationTime:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)) // time, when the message was created
		.replace(/{{replace:(.*?)=>(.*?)}}/g, (_, replaceThis, replaceWith) => {
			itemsForReplacing.push([replaceThis, replaceWith]);
			return "";
		})
		.replace(/{{replace:(.*?)}}/g, (_, replaceThis) => {
			itemsForReplacing.push([replaceThis, ""]);
			return "";
		});

	itemsForReplacing.forEach(([replaceThis, replaceWith]) => {
		const beautyReplaceThis = escapeRegExp(replaceThis).replace(/\\\\n/g, "\\n");
		const beautyReplaceWith = replaceWith.replace(/\\n/g, "\n");
		proccessedContent = proccessedContent.replace(new RegExp(beautyReplaceThis, "g"), beautyReplaceWith);
	});
	return proccessedContent;
}

// Copy tab and blockquotes to every new line of {{content*}} or {{voiceTranscript*}} if they are placed in front of this variables.
// https://github.com/soberhacker/obsidian-telegram-sync/issues/131
function addLeadingForEveryLine(text: string, leadingChars?: string): string {
	if (!leadingChars) return text;
	return text
		.split("\n")
		.map((line) => leadingChars + line)
		.join("\n");
}

function processText(text: string, leadingChars?: string, property?: string): string {
	if (!property || property.toLowerCase() == "text") return addLeadingForEveryLine(text, leadingChars);
	if (property.toLowerCase() == "firstline") return leadingChars + text.split("\n")[0];
	if (property.toLowerCase() == "nofirstline") {
		let lines = text.split("\n");
		lines = lines.slice(1);
		return leadingChars + lines.join("\n");
	}
	// if property is length
	if (Number.isInteger(parseFloat(property || "")))
		return addLeadingForEveryLine(text.substring(0, Number(property)), leadingChars);
	return "";
}

function pasteText(
	plugin: TelegramSyncPlugin,
	pasteType: "content" | "voiceTranscript",
	pasteHere: string,
	pasteContent: string,
	pasteText: string
) {
	const leadingRE = new RegExp(`^([>\\s]+){{${pasteType}}}`);
	const leadingAndPropertyRE = new RegExp(`^([>\\s]+){{${pasteType}:(.*?)}}`);
	const propertyRE = new RegExp(`{{${pasteType}:(.*?)}}`, "g");
	const allRE = new RegExp(`{{${pasteType}}}`, "g");
	return pasteHere
		.replace(leadingRE, (_, leadingChars) => processText(pasteContent, leadingChars))
		.replace(leadingAndPropertyRE, (_, leadingChars, property) => {
			const processedText = processText(pasteText, leadingChars, property);
			if (!processedText && property && pasteText) {
				displayAndLog(plugin, `Template variable {{${pasteType}}:${property}}} isn't supported!`, _5sec);
			}
			return processedText;
		})
		.replace(allRE, pasteContent)
		.replace(propertyRE, (_, property: string) => processText(pasteText, undefined, property));
}

export function getTelegramMdPath(plugin: TelegramSyncPlugin) {
	// Determine the location for the Telegram.md file
	const location = plugin.settings.newNotesLocation || "";
	createFolderIfNotExist(plugin.app.vault, location);
	const telegramMdPath = normalizePath(location ? `${location}/Telegram.md` : "Telegram.md");
	return telegramMdPath;
}
