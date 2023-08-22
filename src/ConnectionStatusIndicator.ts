import { setIcon } from "obsidian";
import TelegramSyncPlugin from "./main";

export const connectionStatusIndicatorSettingName = "Connection status indicator";
export enum ConnectionStatusIndicatorType {
	HIDDEN = "don't show",
	CONSTANT = "always show",
	ONLY_WHEN_ERRORS = "show only when errors",
}
export const checkConnectionMessage =
	"Check internet (proxy) connection, the functionality of Telegram using the official app. If everything is ok, restart Obsidian.";

export default class ConnectionStatusIndicator {
	plugin: TelegramSyncPlugin;
	statusBarIcon?: HTMLElement;

	constructor(plugin: TelegramSyncPlugin) {
		this.plugin = plugin;
	}

	destroy() {
		this.removeStatusBarIcon();
	}

	private createStatusBarIcon() {
		if (this.statusBarIcon) return; // status icon resource has already been allocated
		this.statusBarIcon = this.plugin.addStatusBarItem();
		setIcon(this.statusBarIcon, "send");
	}

	private removeStatusBarIcon() {
		this.statusBarIcon?.remove();
		this.statusBarIcon = undefined;
	}

	updateType(error?: Error) {
		if (
			this.plugin.settings.connectionStatusIndicatorType == ConnectionStatusIndicatorType.HIDDEN ||
			(this.plugin.settings.connectionStatusIndicatorType == ConnectionStatusIndicatorType.ONLY_WHEN_ERRORS &&
				!error)
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
		this.statusBarIcon.removeAttribute("style");
		this.statusBarIcon.removeAttribute("data-tooltip-position");
		this.statusBarIcon.removeAttribute("aria-label");
	}

	private setStatusBarIconToDisconnected(error?: string): void {
		if (!this.statusBarIcon) return;
		this.statusBarIcon.setAttrs({
			style: "background-color: red;",
			"data-tooltip-position": "top",
			"aria-label": error || checkConnectionMessage,
		});
	}
}
