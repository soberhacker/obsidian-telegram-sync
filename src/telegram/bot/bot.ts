import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "src/main";
import { _15sec, _1sec, displayAndLog, displayAndLogError, StatusMessages, _5sec } from "src/utils/logUtils";
import { handleMessage, ifNewReleaseThenShowChanges } from "./message/handlers";
import { reconnect } from "../user/user";
import { getFileObject } from "./message/getters";

// Initialize the Telegram bot and set up message handling
export async function connect(plugin: TelegramSyncPlugin) {
	await disconnect(plugin);

	if (plugin.settings.mainDeviceId && plugin.settings.mainDeviceId !== plugin.currentDeviceId) {
		return;
	}

	if (!plugin.settings.botToken) {
		displayAndLog(plugin, "Telegram bot token is empty.\n\nSyncing is disabled.");
		return;
	}

	// Create a new bot instance and start polling
	plugin.bot = new TelegramBot(plugin.settings.botToken);
	const bot = plugin.bot;
	// Set connected flag to false and log errors when a polling error occurs
	bot.on("polling_error", async (error: unknown) => {
		handlePollingError(plugin, error);
	});

	bot.on("message", async (msg) => {
		if (!plugin.botConnected) {
			plugin.botConnected = true;
			plugin.lastPollingErrors = [];
		}

		// if user disconnected and should be connected then reconnect it
		if (!plugin.userConnected) await plugin.syncRestartTelegram("user");

		const { fileObject, fileType } = getFileObject(msg);
		// skip system messages

		if (!msg.text && !fileType) {
			displayAndLog(plugin, `Got a system message from Telegram Bot`, 0);
			return;
		}
		let fileInfo = "binary";
		if (fileType && fileObject)
			fileInfo = `${fileType} ${
				fileObject instanceof Array ? fileObject[0]?.file_unique_id : fileObject.file_unique_id
			}`;

		displayAndLog(plugin, `Got a message from Telegram Bot: ${msg.text || fileInfo}`, 0);

		// Skip processing if the message is a "/start" command
		// https://github.com/soberhacker/obsidian-telegram-sync/issues/109
		if (msg.text === "/start") {
			return;
		}

		// Store topic name if "/topicName " command
		if (msg.text?.includes("/topicName")) {
			await plugin.settingsTab.storeTopicName(msg);
			return;
		}

		try {
			await handleMessage(plugin, msg);
			await ifNewReleaseThenShowChanges(plugin, msg);
		} catch (error) {
			await displayAndLogError(plugin, error, "", "", msg, _15sec);
		}
	});

	try {
		// Check if the bot is connected and set the connected flag accordingly
		try {
			plugin.botUser = await bot.getMe();
			plugin.lastPollingErrors = [];
		} finally {
			await bot.startPolling();
		}
		plugin.botConnected = true;
	} catch (error) {
		if (!bot || !bot.isPolling())
			await displayAndLogError(
				plugin,
				error,
				StatusMessages.botDisconnected,
				"Check internet(proxy) connection, the functionality of Telegram using the official app. If everything is ok, restart Obsidian."
			);
	}
}

// Stop the bot polling
export async function disconnect(plugin: TelegramSyncPlugin) {
	try {
		plugin.bot && (await plugin.bot.stopPolling());
	} finally {
		plugin.bot = undefined;
		plugin.botUser = undefined;
		plugin.botConnected = false;
	}
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handlePollingError(plugin: TelegramSyncPlugin, error: any) {
	let pollingError = "unknown";

	try {
		const errorCode = error.response.body.error_code;

		if (errorCode === 409) {
			pollingError = "twoBotInstances";
		}

		if (errorCode === 401) {
			pollingError = "unAuthorized";
		}
	} catch {
		try {
			pollingError = error.code === "EFATAL" ? "fatalError" : pollingError;
		} catch {
			pollingError = "unknown";
		}
	}

	if (plugin.lastPollingErrors.length == 0 || !plugin.lastPollingErrors.includes(pollingError)) {
		plugin.lastPollingErrors.push(pollingError);
		if (!(pollingError == "twoBotInstances")) {
			plugin.botConnected = false;
			await displayAndLogError(plugin, error, StatusMessages.botDisconnected);
		}
	}

	if (!(pollingError == "twoBotInstances")) checkConnectionAfterError(plugin);
}

async function checkConnectionAfterError(plugin: TelegramSyncPlugin, intervalInSeconds = 15) {
	if (plugin.checkingBotConnection || !plugin.bot || !plugin.bot.isPolling()) return;
	if (!plugin.checkingBotConnection && plugin.botConnected) plugin.lastPollingErrors = [];
	try {
		plugin.checkingBotConnection = true;
		await new Promise((resolve) => setTimeout(resolve, intervalInSeconds * _1sec));
		plugin.botUser = await plugin.bot.getMe();
		plugin.botConnected = true;
		plugin.lastPollingErrors = [];
		plugin.checkingBotConnection = false;
		displayAndLog(plugin, StatusMessages.botReconnected, _5sec);
		reconnect(plugin);
	} catch {
		plugin.checkingBotConnection = false;
	}
}
