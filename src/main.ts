import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSyncSettings, TelegramSyncSettingTab } from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import * as async from "async";
import { machineIdSync } from "node-machine-id";
import { _15sec, _2min, displayAndLog, StatusMessages, _5sec } from "./utils/logUtils";
import { appendMessageToTelegramMd } from "./telegram/bot/message/processors";
import * as Client from "./telegram/user/client";
import * as Bot from "./telegram/bot/bot";
import * as User from "./telegram/user/user";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	settingsTab: TelegramSyncSettingTab;
	botConnected = false;
	userConnected = false;
	checkingBotConnection = false;
	checkingUserConnection = false;
	bot?: TelegramBot;
	botUser?: TelegramBot.User;
	messageQueueToTelegramMd: async.QueueObject<unknown>;
	listOfNotePaths: string[] = [];
	currentDeviceId = machineIdSync(true);
	lastPollingErrors: string[] = [];
	restartingIntervalId: NodeJS.Timer;
	restartingIntervalTime = _15sec;

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

	restartTelegram = async (sessionType?: Client.SessionType) => {
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
				this.restartingIntervalId = setInterval(this.syncRestartTelegram, this.restartingIntervalTime);
			}
		} catch {
			if (this.restartingIntervalTime < _2min) this.restartingIntervalTime = this.restartingIntervalTime * 2;
			clearInterval(this.restartingIntervalId);
			this.restartingIntervalId = setInterval(this.syncRestartTelegram, this.restartingIntervalTime);
		}
	};

	restartTelegramQueue = Promise.resolve();

	syncRestartTelegram = async (sessionType?: Client.SessionType) => {
		let error: Error | undefined;
		this.restartTelegramQueue = this.restartTelegramQueue
			.then(async () => await this.restartTelegram(sessionType))
			.catch((e) => {
				error = e;
			});
		const result = await this.restartTelegramQueue;
		if (error) throw error;
		return result;
	};

	// Load the plugin, settings, and initialize the bot
	async onload() {
		console.log(`Loading ${this.manifest.name} plugin`);
		await this.loadSettings();

		// Add a settings tab for this plugin
		this.settingsTab = new TelegramSyncSettingTab(this);
		this.addSettingTab(this.settingsTab);

		// Create a queue to handle appending messages to the Telegram.md file
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.messageQueueToTelegramMd = async.queue(async (task: any) => {
			await appendMessageToTelegramMd(this, task.msg, task.formattedContent, task.error);
		}, 1);

		// Initialize the Telegram bot when Obsidian layout is fully loaded
		this.app.workspace.onLayoutReady(async () => {
			await this.initTelegram();
			// restart telegram bot or user if needed
			this.restartingIntervalId = setInterval(this.syncRestartTelegram, this.restartingIntervalTime);
		});
	}

	async onunload(): Promise<void> {
		await Bot.disconnect(this);
		await User.disconnect(this);
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
}
