import TelegramBot from "node-telegram-bot-api";
import { Notice } from "obsidian";
import TelegramSyncPlugin from "src/main";

export const _1sec = 1000;
export const _2sec = 2 * _1sec;
export const _5sec = 5 * _1sec;
export const _15sec = 15 * _1sec;
export const _1min = 60 * _1sec;
export const _2min = 2 * _1min;
export const _5min = 5 * _1min;
export const _30min = 30 * _1min;
export const _1h = 60 * _1min;
export const _2h = 2 * _1h;
export const doNotHide = 24 * _1h;

// Show notification and log message into console.
export function displayAndLog(plugin: TelegramSyncPlugin, message: string, timeout?: number) {
	const beautyMessage = message.replace(/^Error:\s*/, "");
	if (timeout !== 0) {
		new Notice(beautyMessage, timeout || doNotHide);
	}
	console.log(`${plugin.manifest.name}: ${beautyMessage}`);
}

// Show error to console, telegram, display
export async function displayAndLogError(
	plugin: TelegramSyncPlugin,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error: any,
	msg?: TelegramBot.Message,
	timeout?: number
) {
	const beautyError = `Error: ${error}`.replace(/^Error:\s*/, "");
	displayAndLog(plugin, beautyError, timeout);
	if (msg) {
		await plugin.bot?.sendMessage(msg.chat.id, `...❌...\n\n${beautyError}`, {
			reply_to_message_id: msg.message_id,
		});
	}
}
