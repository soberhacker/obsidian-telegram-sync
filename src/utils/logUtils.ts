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

// TODO: connect with ConnectionStatus
export enum StatusMessages {
	BOT_CONNECTED = "Telegram bot is connected!",
	BOT_DISCONNECTED = "Telegram bot is disconnected!",
	USER_DISCONNECTED = "Telegram user is disconnected!",
}

interface PersistentNotice {
	notice: Notice;
	message: string;
}
let persistentNotices: PersistentNotice[] = [];

// Show notification and log message into console.
export function displayAndLog(plugin: TelegramSyncPlugin, message: string, timeout?: number) {
	console.log(`${plugin.manifest.name} => ${message}`);

	if (timeout == 0) return;
	const notice = new Notice(message, timeout || doNotHide);

	const hideBotDisconnectedMessages = message.contains(StatusMessages.BOT_CONNECTED);
	persistentNotices = persistentNotices.filter((persistentNotice) => {
		const shouldHide =
			(hideBotDisconnectedMessages && persistentNotice.message.contains(StatusMessages.BOT_DISCONNECTED)) ||
			persistentNotice.message == message;
		if (shouldHide) {
			persistentNotice.notice.hide();
		}
		return !shouldHide;
	});

	if (!timeout) persistentNotices.push({ notice, message });
}

// Show error to console, telegram, display
export async function displayAndLogError(
	plugin: TelegramSyncPlugin,
	error: Error,
	status?: string,
	action?: string,
	msg?: TelegramBot.Message,
	timeout?: number, // 0 - do not show in obsidian | undefined - never hide
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

// changing GramJs version can cause cache issues and wrong alerts, so it's cure for it
export function hideMTProtoAlerts(plugin: TelegramSyncPlugin) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const originalAlert = window.alert as any;
	if (!originalAlert.__isOverridden) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		window.alert = function (message?: any) {
			if (message.includes("Missing MTProto Entity")) {
				localStorage.removeItem("GramJs:apiCache");
				plugin.settings.cacheCleanupAtStartup = true;
				plugin.saveSettings();
				displayAndLog(
					plugin,
					"Telegram Sync got errors during cache cleanup from the previous plugin version.\n\nPlease close all instances of Obsidian and restart it. You may need to repeat it twice.\n\nApologize for the inconvenience",
				);
				return;
			}
			originalAlert(message);
		};
		originalAlert.__isOverridden = true;
	}
}
