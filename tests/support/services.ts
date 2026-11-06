import type TelegramSyncPlugin from "../../src/main";
import type TelegramBot from "node-telegram-bot-api";
import { convertMessageTextToMarkdown } from "../../src/telegram/bot/message/convertToMarkdown";

export const state = { errors: [] as unknown[], templateFiles: [] as string[][] };
export function resetServices() {
	state.errors.length = 0;
	state.templateFiles.length = 0;
}
export class TFile {
	constructor(public path: string) {}
}
export const normalizePath = (value: string) => value.replace(/\\/g, "/");
export const _3MB = 3 * 1024 * 1024;
export const _15sec = 15000,
	_5sec = 5000,
	_1sec = 1000;
export const defaultDelimiter = "\n\n***\n\n";
export const canUpdateProcessingDate = false;
export const ProgressBarType = { DOWNLOADING: 0 };
export const getOffsetDate = () => new Date();
export const unixTime2Date = (value: number) => new Date(value * 1000);
export function displayAndLog() {}
export function displayAndLogError(_plugin: unknown, error: unknown) {
	state.errors.push(error);
}
export function addOriginalUserMsg() {}
export const getMessageDistributionRule = async (plugin: TelegramSyncPlugin) =>
	plugin.settings.messageDistributionRules[0];
export const getMessageDistributionRuleInfo = (rule: unknown) => rule;
export async function enqueue<T>(fn: (...args: unknown[]) => T, ...args: unknown[]): Promise<T> {
	return fn(...args);
}
export async function createFolderIfNotExist() {}
export async function createProgressBar() {}
export async function deleteProgressBar() {}
export async function updateProgressBar() {}
export async function downloadMedia() {
	throw new Error("Unexpected user-session download");
}
export async function applyNotePathTemplate() {
	return "Inbox/post.md";
}
export async function applyFilesPathTemplate(
	_p: unknown,
	_rule: unknown,
	_msg: unknown,
	type: string,
	extension: string,
	name: string,
) {
	return `Inbox/${type}s/${name}.${extension}`;
}
export async function getUniqueFilePath(_vault: unknown, _paths: unknown, candidate: string) {
	return candidate;
}
export async function applyNoteContentTemplate(
	_plugin: unknown,
	_template: string,
	msg: TelegramBot.Message,
	files: string[] = [],
	richMarkdown?: string,
) {
	state.templateFiles.push(files);
	return convertMessageTextToMarkdown(msg, richMarkdown);
}
export async function appendContentToNote(vault: TelegramSyncPlugin["app"]["vault"], path: string, content: string) {
	await vault.create(path, content);
}
export async function finalizeMessageProcessing(plugin: TelegramSyncPlugin, msg: TelegramBot.Message) {
	await plugin.bot?.setMessageReaction(msg.chat.id, msg.message_id, { reaction: [{ type: "emoji", emoji: "👾" }] });
}

export const sanitizeFileName = (value: string) => value;
export const sanitizeFilePath = (value: string) => value;
export const formatDateTime = (value: Date) => value.toISOString();
export const emoticonProcessed = "👾",
	emoticonProcessedEdited = "🦄";
export async function setReaction() {}

export const _1h = 3600000;
export const defaultFileNameTemplate = "{{file:name}}.{{file:extension}}";
export const defaultNoteNameTemplate = "{{content}}.md";
