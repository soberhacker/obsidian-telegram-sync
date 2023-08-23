import { setIcon } from "obsidian";
import TelegramSyncPlugin from "./main";

export const connectionStatusIndicatorSettingName = "Connection status indicator";
export enum ConnectionStatusIndicatorType {
	HIDDEN = "never show, log the errors",
	CONSTANT = "show constantly all states",
	ONLY_WHEN_ERRORS = "show only when connection errors",
}
export type KeysOfConnectionStatusIndicatorType = keyof typeof ConnectionStatusIndicatorType;
export const checkConnectionMessage =
	"Check internet (proxy) connection, the functionality of Telegram using the official app. If everything is ok, restart Obsidian.";

export default class ConnectionStatusIndicator {
	plugin: TelegramSyncPlugin;
	statusBarIcon?: HTMLElement;
	statusBarLabel?: HTMLElement;

	constructor(plugin: TelegramSyncPlugin) {
		this.plugin = plugin;
	}

	destroy() {
		this.removeStatusBarIcon();
	}

	private createStatusBarIcon() {
		if (this.statusBarIcon) return; // status icon resource has already been allocated
		this.statusBarIcon = this.plugin.addStatusBarItem();
		this.statusBarIcon.id = "connection-status-indicator";
		setIcon(this.statusBarIcon, "send");
		this.statusBarLabel = this.statusBarIcon.createEl("label");
		this.statusBarLabel.setAttr("for", "connection-status-indicator");
	}

	private removeStatusBarIcon() {
		this.statusBarIcon?.remove();
		this.statusBarLabel?.remove();
		this.statusBarIcon = undefined;
		this.statusBarLabel = undefined;
	}

	updateType(error?: Error) {
		if (
			this.plugin.settings.connectionStatusIndicatorType == "HIDDEN" ||
			(this.plugin.settings.connectionStatusIndicatorType == "ONLY_WHEN_ERRORS" && !error)
		) {
			this.removeStatusBarIcon();
			return;
		}
		this.createStatusBarIcon();

		if (this.plugin.isBotConnected()) this.setStatusBarIconToConnected();
		else this.setStatusBarIconToDisconnected(error?.message);
	}

	private setStatusBarIconToConnected() {
		if (!this.statusBarIcon) return;
		this.statusBarLabel?.setText("");
		this.statusBarLabel?.removeAttribute("style");
		this.statusBarIcon.removeAttribute("data-tooltip-position");
		this.statusBarIcon.removeAttribute("aria-label");
	}

	private setStatusBarIconToDisconnected(error?: string): void {
		if (!this.statusBarIcon) return;
		this.statusBarIcon.setAttrs({
			"data-tooltip-position": "top",
			"aria-label": `${error}\n${checkConnectionMessage}`.trimStart(),
		});
		this.statusBarLabel?.setAttr(
			"style",
			"position: relative; left: -3px; bottom: -3px; font-weight: bold; color:red;",
		);
		this.statusBarLabel?.setText("х");
	}
}
