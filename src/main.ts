import { Plugin, setIcon } from "obsidian";
import {
	DEFAULT_SETTINGS,
	TelegramSyncSettings,
	TelegramSyncSettingTab,
	HowToInformAboutBotStatusType,
	ParameterNameHowToInformAboutBotStatus,
} from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import { machineIdSync } from "node-machine-id";
import { _15sec, _2min, displayAndLog, StatusMessages, _5sec } from "./utils/logUtils";
import * as Client from "./telegram/user/client";
import * as Bot from "./telegram/bot/bot";
import * as User from "./telegram/user/user";
import { enqueue } from "./utils/queues";
import { tooManyRequestsIntervalId } from "./telegram/bot/tooManyRequests";
import { cachedMessagesIntervalId } from "./telegram/user/convertors";
import { handleMediaGroupIntervalId } from "./telegram/bot/message/handlers";

export const MessageCheckConnection =
	"Check internet(proxy) connection, the functionality of Telegram using the official app. If everything is ok, restart Obsidian.";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	settingsTab: TelegramSyncSettingTab;
	private botStatus: "connected" | "disconnected" = "disconnected";
	userConnected = false;
	checkingBotConnection = false;
	checkingUserConnection = false;
	bot?: TelegramBot;
	botUser?: TelegramBot.User;
	listOfNotePaths: string[] = [];
	currentDeviceId = machineIdSync(true);
	lastPollingErrors: string[] = [];
	restartingIntervalId: NodeJS.Timer;
	restartingIntervalTime = _15sec;
	messagesLeftCnt = 0;
	statusIcon?: HTMLElement;
	pluginStatus: "unloading" | "unloaded";

	async initTelegram(initType?: Client.SessionType) {
		this.lastPollingErrors = [];
		this.messagesLeftCnt = 0;
		if (!initType || initType == "user") {
			try {
				this.checkingUserConnection = true;
				await User.connect(this, this.settings.telegramSessionType, this.settings.telegramSessionId);
			} finally {
				this.checkingUserConnection = false;
			}
		}
		if (!initType || initType == "bot") {
			try {
				this.checkingBotConnection = true;
				await Bot.connect(this);
			} finally {
				this.checkingBotConnection = false;
			}
		}
	}

	async restartTelegram(sessionType?: Client.SessionType) {
		let needRestartInterval = false;
		try {
			if (
				(!sessionType || sessionType == "user") &&
				!this.userConnected &&
				!this.checkingUserConnection &&
				this.settings.telegramSessionType == "user"
			) {
				await this.initTelegram("user");
				needRestartInterval = true;
			}

			if (
				(!sessionType || sessionType == "bot") &&
				!this.isBotConnected() &&
				!this.checkingBotConnection &&
				this.settings?.botToken
			) {
				await this.initTelegram("bot");
				displayAndLog(this, StatusMessages.botReconnected, _5sec);
				needRestartInterval = true;
			}

			if (needRestartInterval) {
				this.restartingIntervalTime = _15sec;
				clearInterval(this.restartingIntervalId);
				this.restartingIntervalId = setInterval(
					async () => await enqueue(this, this.restartTelegram, sessionType),
					this.restartingIntervalTime,
				);
			}
		} catch {
			if (this.restartingIntervalTime < _2min) this.restartingIntervalTime = this.restartingIntervalTime * 2;
			clearInterval(this.restartingIntervalId);
			this.restartingIntervalId = setInterval(
				async () => await enqueue(this, this.restartTelegram, sessionType),
				this.restartingIntervalTime,
			);
		}
	}

	// Load the plugin, settings, and initialize the bot
	async onload() {
		console.log(`Loading ${this.manifest.name} plugin`);
		await this.loadSettings();
		this.addStatusIconIdneeded();
		// TODO in 2024: Remove allowedChatFromUsernames, because it is deprecated
		if (this.settings.allowedChatFromUsernames.length != 0) {
			this.settings.allowedChats = [...this.settings.allowedChatFromUsernames];
			this.settings.allowedChatFromUsernames = [];
			await this.saveSettings();
		}

		// Add a settings tab for this plugin
		this.settingsTab = new TelegramSyncSettingTab(this);
		this.addSettingTab(this.settingsTab);

		// Initialize the Telegram bot when Obsidian layout is fully loaded
		this.app.workspace.onLayoutReady(async () => {
			await this.initTelegram();
			// restart telegram bot or user if needed
			this.restartingIntervalId = setInterval(
				async () => await enqueue(this, this.restartTelegram),
				this.restartingIntervalTime,
			);
		});
	}

	async onunload(): Promise<void> {
		this.pluginStatus = "unloading";
		clearInterval(this.restartingIntervalId);
		clearInterval(tooManyRequestsIntervalId);
		clearInterval(cachedMessagesIntervalId);
		clearInterval(handleMediaGroupIntervalId);
		this.clearStatusIcon();
		await Bot.disconnect(this);
		await User.disconnect(this);
		this.pluginStatus = "unloaded";
	}

	needToShowStatusBar(): boolean {
		switch (this.settings.howToInformAboutBotStatus) {
			case HowToInformAboutBotStatusType.showBotLogs:
				return false;
			case HowToInformAboutBotStatusType.showBotStatusBar:
				return true;
			case HowToInformAboutBotStatusType.showBotStatusBarErrorsOnly:
				if (this.isBotConnected()) return false;
				else return true;
			default:
				throw new Error(
					`Unknown configuration value ${this.settings.howToInformAboutBotStatus} for parameter ${ParameterNameHowToInformAboutBotStatus}`,
				);
		}
	}

	setStatusIconDisonnectedStyleProperties(): void {
		this?.statusIcon?.setAttrs({
			style: "background-color: red;",
			"data-tooltip-position": "top",
			"aria-label": MessageCheckConnection,
		});
	}

	addStatusIconIdneeded(): void {
		if (this.statusIcon !== undefined) return; // status icon resource has already been allocated
		if (this.pluginStatus == "unloading") return;
		if (!this.needToShowStatusBar()) return;
		this.statusIcon = this.addStatusBarItem();
		setIcon(this.statusIcon, "send");
		if (this.isBotConnected()) this.setStatusIconConnectedStyleProperties();
		else this.setStatusIconDisonnectedStyleProperties();
	}

	clearStatusIcon(): void {
		this.statusIcon?.remove();
		this.statusIcon = undefined;
	}

	// Load settings from the plugin's data
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save settings to the plugin's data
	async saveSettings() {
		await this.saveData(this.settings);
	}

	async getBotUser(msg: TelegramBot.Message): Promise<TelegramBot.User> {
		this.botUser = this.botUser || (await this.bot?.getMe());
		if (!this.botUser) throw new Error("Can't get access to bot info. Restart the Telegram Sync plugin");
		return this.botUser;
	}

	isBotConnected(): boolean {
		return this.botStatus === "connected";
	}

	setBotState(state: "connected" | "disconnected"): void {
		this.botStatus = state;
		this.updatePluginStatusIcon();
	}

	updatePluginStatusIcon(recreateStatusIcon = false): void {
		if (recreateStatusIcon) this.clearStatusIcon();
		this.addStatusIconIdneeded();

		// if icon resource is not allocated but icon should not be shown then allocate icon resouce
		if (this.statusIcon !== undefined && this.connectedStatusBarShouldBeHidden()) {
			this.clearStatusIcon();
			return;
		}

		if (this.isBotConnected()) {
			this.setStatusIconConnectedStyleProperties();
		} else this.setStatusIconDisonnectedStyleProperties();
	}

	private setStatusIconConnectedStyleProperties() {
		this.statusIcon?.removeAttribute("style");
		this.statusIcon?.removeAttribute("data-tooltip-position");
		this.statusIcon?.removeAttribute("aria-label");
	}

	private connectedStatusBarShouldBeHidden(): boolean {
		return !this.needToShowStatusBar() && this.isBotConnected();
	}
}
