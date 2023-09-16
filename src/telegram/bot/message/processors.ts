import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "../../../main";
import {
	getChatLink,
	getChatName,
	getForwardFromLink,
	getForwardFromName,
	getHashtag,
	getReplyMessageId,
	getTopic,
	getTopicId,
	getTopicLink,
	getUrl,
	getUserLink,
} from "./getters";
import { TFile, normalizePath } from "obsidian";
import { formatDateTime, unixTime2Date } from "../../../utils/dateUtils";
import { _15sec, _1h, _5sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";
import { convertMessageTextToMarkdown, escapeRegExp } from "./convertToMarkdown";
import * as Client from "../../user/client";
import { enqueue } from "src/utils/queues";
import { sanitizeFileName, sanitizeFilePath } from "src/utils/fsUtils";
import path from "path";
import { defaultFileNameTemplate, defaultNoteNameTemplate } from "src/settings/messageDistribution";

// Delete a message or send a confirmation reply based on settings and message age
export async function finalizeMessageProcessing(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, error?: Error) {
	if (error) await displayAndLogError(plugin, error, "", "", msg, _5sec);
	if (error || !plugin.bot) {
		return;
	}

	const messageTime = unixTime2Date(msg.date);
	const timeDifference = new Date().getTime() - messageTime.getTime();
	const hoursDifference = timeDifference / _1h;

	if (plugin.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
		// Send the initial progress bar
		await plugin.bot?.deleteMessage(msg.chat.id, msg.message_id);
	} else {
		let needReply = true;
		let errorMessage = "";
		try {
			if (plugin.settings.telegramSessionType == "user" && plugin.botUser) {
				await enqueue(Client.sendReaction, plugin.botUser, msg, "👍");
				needReply = false;
			}
		} catch (e) {
			errorMessage = `\n\nCan't "like" the message, ${e}`;
		}
		if (needReply) {
			await plugin.bot?.sendMessage(msg.chat.id, "...✅..." + errorMessage, {
				reply_to_message_id: msg.message_id,
				disable_notification: true,
			});
		}
	}
}

// Apply a template to a message's content
export async function applyNoteContentTemplate(
	plugin: TelegramSyncPlugin,
	templateFilePath: string,
	msg: TelegramBot.Message,
	filesLinks: string[] = [],
): Promise<string> {
	let templateContent = "";
	try {
		if (templateFilePath) {
			const templateFile = plugin.app.vault.getAbstractFileByPath(normalizePath(templateFilePath)) as TFile;
			templateContent = await plugin.app.vault.read(templateFile);
		}
	} catch (e) {
		throw new Error(`Template "${templateFilePath}" not found! ${e}`);
	}

	const allEmbeddedFilesLinks = filesLinks.length > 0 ? filesLinks.join("\n") : "";
	const allFilesLinks = allEmbeddedFilesLinks.replace("![", "[");
	let textContentMd = "";
	if (!templateContent || templateContent.includes("{{content"))
		textContentMd = await convertMessageTextToMarkdown(msg);
	// Check if the message is forwarded and extract the required information
	const forwardFromLink = getForwardFromLink(msg);
	const fullContent =
		(forwardFromLink ? `**Forwarded from ${forwardFromLink}**\n\n` : "") +
		(allEmbeddedFilesLinks ? allEmbeddedFilesLinks + "\n\n" : "") +
		textContentMd;

	if (!templateContent) {
		return fullContent;
	}

	const itemsForReplacing: [string, string][] = [];

	let processedContent = (await processBasicVariables(plugin, msg, templateContent, textContentMd, fullContent))
		.replace(/{{file}}/g, allEmbeddedFilesLinks) // TODO in 2024: deprecated, remove
		.replace(/{{file:link}}/g, allFilesLinks) // TODO in 2024: deprecated, remove

		.replace(/{{files}}/g, allEmbeddedFilesLinks)
		.replace(/{{files:links}}/g, allFilesLinks)
		.replace(/{{url1}}/g, getUrl(msg)) // first url from the message
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
		processedContent = processedContent.replace(new RegExp(beautyReplaceThis, "g"), beautyReplaceWith);
	});
	return processedContent;
}

export async function applyNotePathTemplate(
	plugin: TelegramSyncPlugin,
	notePathTemplate: string,
	msg: TelegramBot.Message,
): Promise<string> {
	if (!notePathTemplate) return "";

	let textContentMd = "";
	if (notePathTemplate.includes("{{content")) textContentMd = (await convertMessageTextToMarkdown(msg)).slice(0, 100);

	let processedPath = notePathTemplate.endsWith("/") ? notePathTemplate + defaultNoteNameTemplate : notePathTemplate;
	processedPath = await processBasicVariables(plugin, msg, processedPath, textContentMd);
	if (!path.extname(processedPath)) processedPath = processedPath + ".md";
	return sanitizeFilePath(processedPath);
}

export async function applyFilesPathTemplate(
	plugin: TelegramSyncPlugin,
	filePathTemplate: string,
	msg: TelegramBot.Message,
	fileType: string,
	fileExtension: string,
	fileName: string,
): Promise<string> {
	if (!filePathTemplate) return "";

	let processedPath = filePathTemplate.endsWith("/") ? filePathTemplate + defaultFileNameTemplate : filePathTemplate;
	processedPath = await processBasicVariables(plugin, msg, processedPath);
	processedPath = processedPath
		.replace(/{{file:type}}/g, fileType)
		.replace(/{{file:name}}/g, fileName)
		.replace(/{{file:extension}}/g, fileExtension);
	if (!path.extname(processedPath)) processedPath = processedPath + "." + fileExtension;
	return sanitizeFilePath(processedPath);
}

// Apply a template to a message's content
export async function processBasicVariables(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	processThis: string,
	messageText?: string,
	messageContent?: string,
	isPath = false,
): Promise<string> {
	const dateTimeNow = new Date();
	const messageDateTime = unixTime2Date(msg.date, msg.message_id);
	const creationDateTime = msg.forward_date ? unixTime2Date(msg.forward_date, msg.message_id) : messageDateTime;

	let voiceTranscript = "";
	if (processThis.includes("{{voiceTranscript") && plugin.bot) {
		voiceTranscript = await Client.transcribeAudio(plugin.bot, msg, await plugin.getBotUser());
	}

	const lines = processThis.split("\n");
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		if (line.includes("{{content") && (messageContent || messageText)) {
			lines[i] = pasteText(plugin, "content", line, messageContent || messageText || "", messageText || "");
		}

		if (line.includes("{{voiceTranscript")) {
			lines[i] = pasteText(plugin, "voiceTranscript", line, voiceTranscript, voiceTranscript);
		}
	}
	let processedContent = lines.join("\n");

	processedContent = processedContent
		.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{forwardFrom}}/g, getForwardFromLink(msg))
		.replace(/{{forwardFrom:name}}/g, prepareIfPath(isPath, getForwardFromName(msg))) // name of forwarded message creator
		.replace(/{{user}}/g, getUserLink(msg)) // link to the user who sent the message
		.replace(/{{user:name}}/g, prepareIfPath(isPath, msg.from?.username || ""))
		.replace(
			/{{user:fullName}}/g,
			prepareIfPath(isPath, `${msg.from?.first_name} ${msg.from?.last_name || ""}`.trim()),
		)
		.replace(/{{userId}}/g, msg.from?.id.toString() || msg.message_id.toString()) // id of the user who sent the message
		.replace(/{{chat}}/g, getChatLink(msg)) // link to the chat with the message
		.replace(/{{chatId}}/g, msg.chat.id.toString()) // id of the chat with the message
		.replace(/{{chat:name}}/g, prepareIfPath(isPath, getChatName(msg))) // name of the chat (bot / group / channel)
		.replace(/{{topic}}/g, await getTopicLink(plugin, msg)) // link to the topic with the message
		.replace(/{{topic:name}}/g, prepareIfPath(isPath, (await getTopic(plugin, msg))?.name || "")) // link to the topic with the message
		.replace(/{{topicId}}/g, getTopicId(msg)?.toString() || "") // head message id representing the topic
		.replace(/{{messageId}}/g, msg.message_id.toString())
		.replace(/{{replyMessageId}}/g, getReplyMessageId(msg))
		.replace(/{{hashtag:\[(\d+)\]}}/g, (_, num) => getHashtag(msg, num))
		.replace(/{{creationDate:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)) // date, when the message was created
		.replace(/{{creationTime:(.*?)}}/g, (_, format) => formatDateTime(creationDateTime, format)); // time, when the message was created
	return processedContent;
}

function prepareIfPath(isPath: boolean, value: string): string {
	return isPath ? sanitizeFileName(value) : value;
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
	let finalText = "";
	const lowerCaseProperty = (property && property.toLowerCase()) || "text";

	if (lowerCaseProperty == "text") finalText = text;
	// TODO in 2024: remove deprecated code
	// deprecated
	else if (lowerCaseProperty == "firstline") finalText = text.split("\n")[0];
	// deprecated
	else if (lowerCaseProperty == "nofirstline") finalText = text.split("\n").slice(1).join("\n");
	// if property is length
	else if (Number.isInteger(parseFloat(lowerCaseProperty))) finalText = text.substring(0, Number(property));

	if (finalText) return addLeadingForEveryLine(finalText, leadingChars);

	// if property is range
	const rangePattern = /^\[\d+-\d+\]$/;
	const singleLinePattern = /^\[\d+\]$/;
	const lastLinePattern = /^\[-\d+\]$/;
	const fromLineToEndPattern = /^\[\d+-\]$/;

	let lines = text.split("\n");
	let startLine = 0;
	let endLine = lines.length;

	if (rangePattern.test(lowerCaseProperty)) {
		const range = lowerCaseProperty
			.substring(1, lowerCaseProperty.length - 1)
			.split("-")
			.map(Number);
		startLine = Math.max(0, range[0] - 1);
		endLine = Math.min(lines.length, range[1]);
	} else if (singleLinePattern.test(lowerCaseProperty)) {
		startLine = Number(lowerCaseProperty.substring(1, lowerCaseProperty.length - 1)) - 1;
		endLine = startLine + 1;
	} else if (lastLinePattern.test(lowerCaseProperty)) {
		startLine = Math.max(
			0,
			lines.length - Number(lowerCaseProperty.substring(2, lowerCaseProperty.length - 1)) - 1,
		);
		endLine = startLine + 1;
	} else if (fromLineToEndPattern.test(lowerCaseProperty)) {
		startLine = Number(lowerCaseProperty.substring(1, lowerCaseProperty.length - 2)) - 1;
		endLine = lines.length;
	} else lines = [];

	finalText = lines.slice(startLine, endLine).join("\n");

	return addLeadingForEveryLine(finalText, leadingChars);
}

function pasteText(
	plugin: TelegramSyncPlugin,
	pasteType: "content" | "voiceTranscript",
	pasteHere: string,
	pasteContent: string,
	pasteText: string,
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
