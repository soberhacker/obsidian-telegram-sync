import { Notice } from "obsidian";

// Show notification and log message into console.
export function displayAndLog(message: string, timeout = 5 * 1000) {
	const beautyMessage = message.replace(/^Error:\s*/, "");
	if (timeout !== 0) {
		new Notice(beautyMessage, timeout);
	}
	console.log(this.manifest?.name || "Telegram Sync" + ": " + beautyMessage);
}
