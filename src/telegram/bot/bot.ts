import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "src/main";
import { _1sec, displayAndLog } from "src/utils/logUtils";
import { handleMessage } from "./message/handlers";
import { reconnect } from "../user/user";
import { enqueueByCondition } from "src/utils/queues";
import { clearCachedUnprocessedMessages, forwardUnprocessedMessages } from "../user/sync";

// Initialize the Telegram bot and set up message handling
export async function connect(plugin: TelegramSyncPlugin) {
	if (plugin.checkingUserConnection) return;
	plugin.checkingBotConnection = true;
	try {
		await disconnect(plugin);

		if (!plugin.settings.botToken) {
			displayAndLog(plugin, "Telegram bot token is empty.\n\nSyncing is disabled.");
			plugin.checkingBotConnection = false;
			return;
		}
		// Create a new bot instance and start polling
		plugin.bot = new TelegramBot(plugin.settings.botToken);
		const bot = plugin.bot;
		// Set connected flag to false and log errors when a polling error occurs
		bot.on("polling_error", async (error: unknown) => {
			handlePollingError(plugin, error);
		});

		bot.on("channel_post", async (msg) => {
			await enqueueByCondition(!plugin.settings.parallelMessageProcessing, handleMessage, plugin, msg, true);
		});

		bot.on("edited_message", async (msg) => {
			await enqueueByCondition(!plugin.settings.parallelMessageProcessing, handleMessage, plugin, msg);
		});

		bot.on("message", async (msg) => {
			await enqueueByCondition(!plugin.settings.parallelMessageProcessing, handleMessage, plugin, msg);
		});

		// Check if the bot is connected and set the connected flag accordingly
		try {
			plugin.botUser = await bot.getMe();
			plugin.lastPollingErrors = [];

			if (plugin.settings.processOldMessages && plugin.userConnected && plugin.botUser) {
				await forwardUnprocessedMessages(plugin);
			} else if (!plugin.settings.processOldMessages) {
				clearCachedUnprocessedMessages();
			}
		} finally {
			await bot.startPolling();
		}
		plugin.setBotStatus("connected");
	} catch (error) {
		if (!plugin.bot || !plugin.bot.isPolling()) {
			plugin.setBotStatus("disconnected", error);
		}
	} finally {
		plugin.checkingBotConnection = false;
	}
}

// Stop the bot polling
export async function disconnect(plugin: TelegramSyncPlugin) {
	try {
		plugin.bot && (await plugin.bot.stopPolling());
	} finally {
		plugin.bot = undefined;
		plugin.botUser = undefined;
		plugin.setBotStatus("disconnected");
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
			plugin.setBotStatus("disconnected", error);
		}
	}

	if (!(pollingError == "twoBotInstances")) checkConnectionAfterError(plugin);
}

async function checkConnectionAfterError(plugin: TelegramSyncPlugin, intervalInSeconds = 15) {
	if (plugin.checkingBotConnection || !plugin.bot || !plugin.bot.isPolling()) return;
	if (!plugin.checkingBotConnection && plugin.isBotConnected()) plugin.lastPollingErrors = [];
	try {
		plugin.checkingBotConnection = true;
		await new Promise((resolve) => setTimeout(resolve, intervalInSeconds * _1sec));
		plugin.botUser = await plugin.bot.getMe();
		plugin.setBotStatus("connected");
		plugin.lastPollingErrors = [];
		plugin.checkingBotConnection = false;
		reconnect(plugin);
	} catch {
		plugin.checkingBotConnection = false;
	}
}

export async function setReaction(plugin: TelegramSyncPlugin, msg: TelegramBot.Message, emoji: string) {
	await plugin.bot?.setMessageReaction(msg.chat.id, msg.message_id, { reaction: [{ emoji: emoji, type: "emoji" }] });
}
