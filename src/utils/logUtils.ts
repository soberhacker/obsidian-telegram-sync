import { Notice } from "obsidian";

// Show notification and log message into console.
export function displayMessage(message: string, timeout: number = 5 * 1000): void {
	const beautyMessage = message.replace(/^Error:\s*/, "");
	new Notice(beautyMessage, timeout);
	console.log(this.manifest?.name || "Telegram Sync" + ": " + beautyMessage);
}
