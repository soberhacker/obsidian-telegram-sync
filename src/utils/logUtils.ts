import TelegramBot from "node-telegram-bot-api";
import { Notice } from "obsidian";

// Show notification and log message into console.
export function displayAndLog(message: string, timeout = 5 * 1000) {
	const beautyMessage = message.replace(/^Error:\s*/, "");
	if (timeout !== 0) {
		new Notice(beautyMessage, timeout);
	}
	console.log(this.manifest?.name || "Telegram Sync" + ": " + beautyMessage);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function displayAndLogError(error: any, msg?: TelegramBot.Message, timeout = 5 * 1000) {
	const beautyError = `Error: ${error}`;
	displayAndLog(beautyError, timeout);
	if (msg) {
		await this.bot?.sendMessage(msg.chat.id, `...❌...\n\n${beautyError}`, {
			reply_to_message_id: msg.message_id,
		});
	}
}
