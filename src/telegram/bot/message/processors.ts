import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "../../../main";
import {
	getChatLink,
	getChatName,
	getForwardFromLink,
	getForwardFromName,
	getReplyMessageId,
	getTopic,
	getTopicId,
	getTopicLink,
	getUrl,
	getUserLink,
} from "./getters";
import { getTelegramMdPath } from "src/utils/fsUtils";
import { TFile, normalizePath } from "obsidian";
import { formatDateTime } from "../../../utils/dateUtils";
import { _15sec, _1h, _5sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";
import { convertMessageTextToMarkdown, escapeRegExp } from "./convertToMarkdown";
import * as Client from "../../user/client";

// Delete a message or send a confirmation reply based on settings and message age
export async function finalizeMessageProcessing(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, error?: Error) {
	if (error) await displayAndLogError(plugin, error, "", "", msg, _5sec);
	if (error || !plugin.bot) {
		return;
	}

	const currentTime = new Date();
	const messageTime = new Date(msg.date * 1000);
	const timeDifference = currentTime.getTime() - messageTime.getTime();
	const hoursDifference = timeDifference / _1h;

	if (plugin.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
		// Send the initial progress bar
		await plugin.bot?.deleteMessage(msg.chat.id, msg.message_id);
	} else {
		let needReply = true;
		let errorMessage = "";
		try {
			if (plugin.settings.telegramSessionType == "user" && plugin.botUser) {
				await Client.syncSendReaction(plugin.botUser, msg, "👍");
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

export async function appendMessageToTelegramMd(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	formattedContent: string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error?: Error
) {
	// Do not append messages if not connected
	if (!plugin.botConnected) return;

	const telegramMdPath = getTelegramMdPath(plugin.app.vault, plugin.settings.newNotesLocation);
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
		voiceTranscript = await Client.transcribeAudio(msg, await plugin.getBotUser(msg));
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
	let processedContent = lines.join("\n");

	processedContent = processedContent
		.replace(/{{file}}/g, fileLink || "")
		.replace(/{{file:link}}/g, fileLink?.startsWith("!") ? fileLink.slice(1) : fileLink || "")
		.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
		.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
		.replace(/{{forwardFrom}}/g, forwardFromLink)
		.replace(/{{forwardFrom:name}}/g, getForwardFromName(msg)) // name of forwarded message creator
		.replace(/{{user}}/g, getUserLink(msg)) // link to the user who sent the message
		.replace(/{{userId}}/g, msg.from?.id.toString() || msg.message_id.toString()) // id of the user who sent the message
		.replace(/{{chat}}/g, getChatLink(msg)) // link to the chat with the message
		.replace(/{{chatId}}/g, msg.chat.id.toString()) // id of the chat with the message
		.replace(/{{chat:name}}/g, getChatName(msg)) // name of the chat (bot / group / channel)
		.replace(/{{topic}}/g, await getTopicLink(plugin, msg)) // link to the topic with the message
		.replace(/{{topic:name}}/g, (await getTopic(plugin, msg))?.name || "") // link to the topic with the message
		.replace(/{{topicId}}/g, getTopicId(msg)?.toString() || "") // head message id representing the topic
		.replace(/{{messageId}}/g, msg.message_id.toString())
		.replace(/{{replyMessageId}}/g, getReplyMessageId(msg))
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
		processedContent = processedContent.replace(new RegExp(beautyReplaceThis, "g"), beautyReplaceWith);
	});
	return processedContent;
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
	if (lowerCaseProperty == "firstline") finalText = text.split("\n")[0];
	if (lowerCaseProperty == "nofirstline") {
		let lines = text.split("\n");
		lines = lines.slice(1);
		finalText = lines.join("\n");
	}
	// if property is length
	if (Number.isInteger(parseFloat(lowerCaseProperty))) finalText = text.substring(0, Number(property));
	return addLeadingForEveryLine(finalText, leadingChars);
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
