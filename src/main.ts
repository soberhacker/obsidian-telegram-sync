import { Plugin, setIcon } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSyncSettings, TelegramSyncSettingTab } from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import { machineIdSync } from "node-machine-id";
import { _15sec, _2min, displayAndLog, StatusMessages, _5sec } from "./utils/logUtils";
import * as Client from "./telegram/user/client";
import * as Bot from "./telegram/bot/bot";
import * as User from "./telegram/user/user";
import { enqueue } from "./utils/queues";
import { tooManyRequestsIntervalId } from "./telegram/bot/tooManyRequests";
import { cachedMessagesIntervalId } from "./telegram/user/convertors";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	settingsTab: TelegramSyncSettingTab;
	private botConnected = false;
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
	statusIcon: HTMLElement | null;

	async initTelegram(initType?: Client.SessionType) {
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
				!this.botConnected &&
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
		this.addStatusIcon();
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
		clearInterval(this.restartingIntervalId);
		clearInterval(tooManyRequestsIntervalId);
		clearInterval(cachedMessagesIntervalId);
		await Bot.disconnect(this);
		await User.disconnect(this);
	}

	addStatusIcon(): void {
		this.statusIcon = this.addStatusBarItem();
		this.statusIcon.setAttrs({
			"style": "background-color: yellow;",
			"data-tooltip-position": "top",
			"aria-label": "bot is connecting"});
		setIcon(this.statusIcon, "send");
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

	botIsConnected(): boolean {
		return this.botConnected;
	}

	botStateSetToConnected(): void {
		this.botConnected = true;
		this.updatePluginStatusIcon();
	}

	botStateSetToDisconnected(): void {
		this.botConnected = false;
		this.updatePluginStatusIcon();
	}

	botStateSetTo(state: boolean): void {
		this.botConnected = state;
		this.updatePluginStatusIcon();
	}

	updatePluginStatusIcon(): void {
		if(this.statusIcon === null && !this.settings.hideConnectedStatusBar) this.addStatusIcon();
		if(this.statusIcon !== null && this.settings.hideConnectedStatusBar) {
			this.statusIcon.remove();
			this.statusIcon = null;
			return;
		}
		if(this.botIsConnected()) {
			this.statusIcon?.removeAttribute("style");
			this.statusIcon?.removeAttribute("data-tooltip-position");
			this.statusIcon?.removeAttribute("aria-label");
			return;
		}
		// Bot is disconnected
		this.statusIcon?.setAttrs({
			"style": "background-color: red;",
			"data-tooltip-position": "top",
			"aria-label": "telegram bot is disconnected"});
	}

}
