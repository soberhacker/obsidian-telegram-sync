import TelegramBot from "node-telegram-bot-api";
import { Notice } from "obsidian";
import TelegramSyncPlugin from "src/main";

// Show notification and log message into console.
export function displayAndLog(plugin: TelegramSyncPlugin, message: string, timeout = 5 * 1000) {
	const beautyMessage = message.replace(/^Error:\s*/, "");
	if (timeout !== 0) {
		new Notice(beautyMessage, timeout);
	}
	console.log(`${plugin.manifest.name}: ${beautyMessage}`);
}

// Show error to console, telegram, display
export async function displayAndLogError(
	plugin: TelegramSyncPlugin,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	error: any,
	msg?: TelegramBot.Message,
	timeout = 5 * 1000
) {
	const beautyError = `Error: ${error}`.replace(/^Error:\s*/, "");
	displayAndLog(plugin, beautyError, timeout);
	if (msg) {
		await plugin.bot?.sendMessage(msg.chat.id, `...❌...\n\n${beautyError}`, {
			reply_to_message_id: msg.message_id,
		});
	}
}
