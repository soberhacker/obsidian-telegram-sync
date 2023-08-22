import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSyncSettings, TelegramSyncSettingTab } from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import { machineIdSync } from "node-machine-id";
import { _15sec, _2min, displayAndLog, StatusMessages, _5sec, displayAndLogError } from "./utils/logUtils";
import * as Client from "./telegram/user/client";
import * as Bot from "./telegram/bot/bot";
import * as User from "./telegram/user/user";
import { enqueue } from "./utils/queues";
import { tooManyRequestsIntervalId } from "./telegram/bot/tooManyRequests";
import { cachedMessagesIntervalId } from "./telegram/user/convertors";
import { handleMediaGroupIntervalId } from "./telegram/bot/message/handlers";
import ConnectionStatusIndicator, { checkConnectionMessage } from "./ConnectionStatusIndicator";

export type ConnectionStatus = "connected" | "disconnected";
export type PluginStatus = "unloading" | "unloaded" | "loading" | "loaded";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	settingsTab: TelegramSyncSettingTab;
	private botStatus: ConnectionStatus = "disconnected";
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
	connectionStatusIndicator = new ConnectionStatusIndicator(this);
	status: PluginStatus = "loading";

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

	setRestartTelegramInterval(newRestartingIntervalTime: number, sessionType?: Client.SessionType) {
		this.restartingIntervalTime = newRestartingIntervalTime;
		clearInterval(this.restartingIntervalId);
		this.restartingIntervalId = setInterval(
			async () => await enqueue(this, this.restartTelegram, sessionType),
			this.restartingIntervalTime,
		);
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

			if (needRestartInterval) this.setRestartTelegramInterval(_15sec);
		} catch {
			this.setRestartTelegramInterval(
				this.restartingIntervalTime < _2min ? this.restartingIntervalTime * 2 : this.restartingIntervalTime,
			);
		}
	}

	// Load the plugin, settings, and initialize the bot
	async onload() {
		this.status = "loading";
		await this.loadSettings();
		// TODO in 2024: Remove allowedChatFromUsernames, because it is deprecated
		if (this.settings.allowedChatFromUsernames.length != 0) {
			this.settings.allowedChats = [...this.settings.allowedChatFromUsernames];
			this.settings.allowedChatFromUsernames = [];
			await this.saveSettings();
		}

		// Add a settings tab for this plugin
		this.settingsTab = new TelegramSyncSettingTab(this.app, this);
		this.addSettingTab(this.settingsTab);

		// Initialize the Telegram bot when Obsidian layout is fully loaded
		this.app.workspace.onLayoutReady(async () => {
			enqueue(this, this.initTelegram);
			// restart telegram bot or user if needed
			this.setRestartTelegramInterval(this.restartingIntervalTime);
		});
		this.status = "loaded";
		console.log(`${this.manifest.name}: ${this.status}`);
	}

	async onunload(): Promise<void> {
		this.status = "unloading";
		clearInterval(this.restartingIntervalId);
		clearInterval(tooManyRequestsIntervalId);
		clearInterval(cachedMessagesIntervalId);
		clearInterval(handleMediaGroupIntervalId);
		this.connectionStatusIndicator.destroy();
		try {
			Bot.disconnect(this);
		} catch (e) {
			console.log(e);
			User.disconnect(this);
		} finally {
			this.status = "unloaded";
			console.log(`${this.manifest.name}: ${this.status}`);
		}
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

	async setBotStatus(status: ConnectionStatus, error?: Error) {
		this.botStatus = status;
		this.connectionStatusIndicator.updateType(error);
		if (this.isBotConnected()) displayAndLog(this, StatusMessages.botConnected, 0);
		else if (!error) displayAndLog(this, StatusMessages.botDisconnected, 0);
		else displayAndLogError(this, error, StatusMessages.botDisconnected, checkConnectionMessage, undefined, 0);
	}
}
