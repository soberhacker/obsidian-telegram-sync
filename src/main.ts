import { Plugin, TFile } from "obsidian";
import { DEFAULT_SETTINGS, TelegramSyncSettings, TelegramSyncSettingTab } from "./settings/Settings";
import TelegramBot from "node-telegram-bot-api";
import * as async from "async";
import { handleMessage, handleFiles, finalizeMessageProcessing } from "./telegram/messageHandlers";
import { formatDateTime } from "./utils/dateUtils";
import { machineIdSync } from "node-machine-id";
import { displayAndLog } from "./utils/logUtils";
import { displayAndLogError } from "./telegram/utils";

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
	settings: TelegramSyncSettings;
	connected = false;
	bot?: TelegramBot;
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

		this.register(async () => {
			await this.stopTelegramBot();
		});

		// Create a queue to handle appending messages to the Telegram.md file
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		this.messageQueueToTelegramMd = async.queue(async (task: any) => {
			await this.appendMessageToTelegramMd(task.msg, task.formattedContent, task.error);
		}, 1);

		// Initialize the Telegram bot when Obsidian layout is fully loaded
		this.app.workspace.onLayoutReady(async () => {
			await this.initTelegramBot();
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

	// Apply a template to a message's content
	async applyTemplate(
		templatePath: string,
		content: string,
		messageDateTime: Date,
		forwardFromLink: string
	): Promise<string> {
		const templateFile = this.app.vault.getAbstractFileByPath(templatePath) as TFile;
		if (!templateFile) {
			return content;
		}
		const dateTimeNow = new Date();
		const templateContent = await this.app.vault.read(templateFile);
		return templateContent
			.replace("{{content}}", content)
			.replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
			.replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
			.replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
			.replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
			.replace(/{{forwardFrom}}/g, forwardFromLink);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async appendMessageToTelegramMd(msg: TelegramBot.Message, formattedContent: string, error?: any) {
		// Do not append messages if not connected
		if (!this.connected) return;

		// Determine the location for the Telegram.md file
		const location = this.settings.newNotesLocation || "";

		const telegramMdPath = location ? `${location}/Telegram.md` : "Telegram.md";
		let telegramMdFile = this.app.vault.getAbstractFileByPath(telegramMdPath) as TFile;

		// Create or modify the Telegram.md file
		if (!telegramMdFile) {
			telegramMdFile = await this.app.vault.create(telegramMdPath, `${formattedContent}\n`);
		} else {
			const fileContent = await this.app.vault.read(telegramMdFile);
			await this.app.vault.modify(telegramMdFile, `${fileContent}\n***\n\n${formattedContent}\n`);
		}
		await this.finalizeMessageProcessing(msg, error);
	}

	async handleMessage(msg: TelegramBot.Message) {
		await handleMessage.call(this, msg);
	}

	// Handle files received in messages
	async handleFiles(msg: TelegramBot.Message) {
		await handleFiles.call(this, msg);
	}

	// Delete a message or send a confirmation reply based on settings and message age
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	async finalizeMessageProcessing(msg: TelegramBot.Message, error?: any) {
		await finalizeMessageProcessing.call(this, msg, error);
	}

	// Show error to console, telegram, display
	async displayAndLogError(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		error: any,
		msg?: TelegramBot.Message,
		timeout = 5 * 1000
	) {
		await displayAndLogError.call(this, error, msg, timeout);
	}

	// Initialize the Telegram bot and set up message handling
	async initTelegramBot() {
		await this.stopTelegramBot();

		if (this.settings.mainDeviceId && this.settings.mainDeviceId !== this.currentDeviceId) {
			return;
		}

		if (!this.settings.botToken) {
			displayAndLog("Telegram bot token is empty. Exit.");
			return;
		}

		// Create a new bot instance and start polling
		this.bot = new TelegramBot(this.settings.botToken, { polling: true });

		// Check if the bot is connected and set the connected flag accordingly
		if (this.bot.isPolling()) {
			this.connected = true;
		}

		this.bot.on("message", async (msg) => {
			this.lastPollingErrors = [];
			displayAndLog(`Got a message from Telegram Bot: ${msg.text || "binary"}`, 0);

			try {
				await this.handleMessage(msg);
			} catch (error) {
				await this.displayAndLogError(error, msg);
			}
		});

		// Set connected flag to false and log errors when a polling error occurs
		this.bot.on("polling_error", async (error: unknown) => {
			this.handlePollingError(error);
		});
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
					'Two Telegram Sync Bots are detected. Set "Main Device Id" in the settings, if only one is needed.',
					10000
				);
			} else {
				await this.displayAndLogError(error);
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
				this.connected = false;
			}
		}
	}
}
// TODO:
// 1. file name conflict (#" symbols) in obsidian links
// https://t.me/obsidian_z/65802/76273
// 2. Заметил досадный баг. Если обсидиан не открыт, в момент перенаправления сообщения через бота, то параметры шаблона не применяются к записи после открытия обсидиана. Запись импортируется без каких либо параметров.
// https://t.me/obsidian_z/65802/76441
// 3. https://github.com/soberhacker/obsidian-telegram-sync/issues/77
// 4. Big files caption creating messages
// 5. Потестил новый релиз. Проявляется ошибка "Error: Folder already exists", если отрыть приложение на десктопе, предварительно отправив сообщение в бота, в то время, когда Obsidian на десктопе не был запущен.
// 6. Да в тех случаях, когда отсутствует ошибка, описанная выше, шаблон при открытии обсидиан на десктопе и загрузке "отложенного" сообщения из бота теперь применяется. НО. поймал пару кейсов, в которых почему то не отработал параметр {{forwardFrom}}, в то время как стальные переменные ({{messageDate:DD.MM.YYYY}} и {{messageTime:HH:mm:ss}}) были заполнены.
// https://t.me/obsidian_z/65802/76879
