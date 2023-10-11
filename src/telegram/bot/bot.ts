import TelegramBot from "node-telegram-bot-api";
import TelegramSyncPlugin from "src/main";
import { _1sec, displayAndLog } from "src/utils/logUtils";
import { handleMessageOrPost } from "./message/handlers";
import { reconnect } from "../user/user";
import { enqueueByCondition } from "src/utils/queues";

// Initialize the Telegram bot and set up message handling
export async function connect(plugin: TelegramSyncPlugin) {
	await disconnect(plugin);

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

	bot.on("channel_post", async (msg) => {
		await enqueueByCondition(!plugin.settings.parallelMessageProcessing, handleMessageOrPost, plugin, msg, "post");
	});

	bot.on("message", async (msg) => {
		await enqueueByCondition(
			!plugin.settings.parallelMessageProcessing,
			handleMessageOrPost,
			plugin,
			msg,
			"message",
		);
	});

	try {
		// Check if the bot is connected and set the connected flag accordingly
		try {
			plugin.botUser = await bot.getMe();
			plugin.lastPollingErrors = [];
		} finally {
			await bot.startPolling();
		}
		plugin.setBotStatus("connected");
	} catch (error) {
		if (!bot || !bot.isPolling()) {
			plugin.setBotStatus("disconnected", error);
		}
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
