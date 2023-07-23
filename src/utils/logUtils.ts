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

export enum StatusMessages {
	botReconnected = "Telegram bot is reconnected!",
	botDisconnected = "Telegram bot is disconnected!",
	userDisconnected = "Telegram user is disconnected!",
}

interface PersistentNotice {
	notice: Notice;
	message: string;
}
const persistentNotices: PersistentNotice[] = [];

// Show notification and log message into console.
export function displayAndLog(plugin: TelegramSyncPlugin, message: string, timeout?: number) {
	if (timeout !== 0) {
		const notice = new Notice(message, timeout || doNotHide);
		if (!timeout) {
			persistentNotices.push({ notice, message: message });
		} else if (persistentNotices.length > 0) {
			const hideBotDisconnectedMessages = message.contains(StatusMessages.botReconnected);
			for (const persistentNotice of persistentNotices) {
				if (
					(hideBotDisconnectedMessages &&
						persistentNotice.message.contains(StatusMessages.botDisconnected)) ||
					persistentNotice.message == message
				) {
					persistentNotice.notice.hide();
					persistentNotices.remove(persistentNotice);
				}
			}
		}
	}
	console.log(`${plugin.manifest.name}: ${message}`);
}

// Show error to console, telegram, display
export async function displayAndLogError(
	plugin: TelegramSyncPlugin,
	error: Error,
	status?: string,
	action?: string,
	msg?: TelegramBot.Message,
	timeout?: number
) {
	let beautyError = `${error.name}: ${error.message.replace(/Error: /g, "")}\n\n${status || ""}\n\n${action || ""}`;
	beautyError = beautyError.trim();
	displayAndLog(plugin, beautyError, timeout);
	if (error.stack) console.log(error.stack);
	if (msg) {
		await plugin.bot?.sendMessage(msg.chat.id, `...❌...\n\n${beautyError}`, {
			reply_to_message_id: msg.message_id,
		});
	}
}
