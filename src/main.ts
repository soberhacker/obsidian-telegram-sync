import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSyncSettings, TelegramSyncSettingTab } from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import * as async from "async";
import { handleMessage, ifNewRelaseThenShowChanges } from "./telegram/messageHandlers";
import { machineIdSync } from "node-machine-id";
import { displayAndLog } from "./utils/logUtils";
import { displayAndLogError } from "./utils/logUtils";
import { appendMessageToTelegramMd } from "./telegram/messageProcessors";
import * as GramJs from "./telegram/GramJs/client";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	botConnected = false;
	bot?: TelegramBot;
	botName?: string;
	messageQueueToTelegramMd: async.QueueObject<unknown>;
	listOfNotePaths: string[] = [];
	currentDeviceId = machineIdSync(true);
	lastPollingErrors: string[] = [];

	// Load the plugin, settings, and initialize the bot
	async onload() {
		console.log(`Loading ${this.manifest.name} plugin`);
		await this.loadSettings();

		// Add a settings tab for this plugin
		this.addSettingTab(new TelegramSyncSettingTab(this));

		// Create a queue to handle appending messages to the Telegram.md file
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.messageQueueToTelegramMd = async.queue(async (task: any) => {
			await appendMessageToTelegramMd(this, task.msg, task.formattedContent, task.error);
		}, 1);

		// Initialize the Telegram bot when Obsidian layout is fully loaded
		this.app.workspace.onLayoutReady(async () => {
			await this.initTelegramBot();
			if (this.botConnected) {
				await this.initTelegramClient();
			}
		});

		this.register(async () => {
			await this.stopTelegramBot();
			await GramJs.stopClient();
		});
	}

	// Load settings from the plugin's data
	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	// Save settings to the plugin's data
	async saveSettings() {
		await this.saveData(this.settings);
	}

	// Initialize the Telegram bot and set up message handling
	async initTelegramBot() {
		await this.stopTelegramBot();

		if (this.settings.mainDeviceId && this.settings.mainDeviceId !== this.currentDeviceId) {
			return;
		}

		if (!this.settings.botToken) {
			displayAndLog(this, "Telegram bot token is empty. Exit.");
			return;
		}

		// Create a new bot instance and start polling
		this.bot = new TelegramBot(this.settings.botToken, { polling: true });

		// Check if the bot is connected and set the connected flag accordingly
		if (this.bot.isPolling()) {
			this.botConnected = true;
			this.botName = (await this.bot.getMe()).username;
		}

		this.bot.on("message", async (msg) => {
			this.lastPollingErrors = [];
			displayAndLog(this, `Got a message from Telegram Bot: ${msg.text || "binary"}`, 0);

			// Skip processing if the message is a "/start" command
			// https://github.com/soberhacker/obsidian-telegram-sync/issues/109
			if (msg.text === "/start") {
				return;
			}

			try {
				await handleMessage(this, msg);
				await ifNewRelaseThenShowChanges(this, msg);
			} catch (error) {
				await displayAndLogError(this, error, msg);
			}
		});

		// Set connected flag to false and log errors when a polling error occurs
		this.bot.on("polling_error", async (error: unknown) => {
			this.handlePollingError(error);
		});
	}

	async initTelegramClient() {
		try {
			if (this.settings.appId !== "" && this.settings.apiHash !== "") {
				await GramJs.initClient(+this.settings.appId, this.settings.apiHash, this.currentDeviceId);
				await GramJs.signInBot(this.settings.botToken);
			}
		} catch (e) {
			await displayAndLogError(this, e, undefined, 60000);
		}
	}

	async handlePollingError(error: unknown) {
		let pollingError = "unknown";

		try {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const error_code = (error as any).response.body.error_code;

			if (error_code === 409) {
				pollingError = "twoBotInstances";
			}

			if (error_code === 401) {
				pollingError = "unAuthorized";
			}
		} catch {
			try {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				pollingError = (error as any).code === "EFATAL" ? "fatalError" : pollingError;
			} catch {
				pollingError = "unknown";
			}
		}

		if (this.lastPollingErrors.length == 0 || !this.lastPollingErrors.includes(pollingError)) {
			this.lastPollingErrors.push(pollingError);
			if (pollingError == "twoBotInstances") {
				displayAndLog(
					this,
					'Two Telegram Sync Bots are detected. Set "Main Device Id" in the settings, if only one is needed.',
					10000
				);
			} else {
				await displayAndLogError(this, error);
			}
		}
	}

	// Stop the bot polling
	async stopTelegramBot() {
		if (this.bot) {
			try {
				await this.bot.stopPolling();
				this.bot = undefined;
			} finally {
				this.botConnected = false;
			}
		}
	}
}
