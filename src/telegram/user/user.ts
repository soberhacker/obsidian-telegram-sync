import TelegramSyncPlugin from "src/main";
import * as client from "./client";
import { _15sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";

export async function connect(plugin: TelegramSyncPlugin, sessionType: client.SessionType, sessionId?: number) {
	if (
		!(
			plugin.settings.appId !== "" &&
			plugin.settings.apiHash !== "" &&
			(sessionType == "user" || plugin.settings.botToken !== "")
		)
	)
		return;

	const initialSessionType = plugin.settings.telegramSessionType;
	try {
		if (!sessionId) {
			plugin.settings.telegramSessionId = client.getNewSessionId();
			await plugin.saveSettings();
		}

		if (sessionType != plugin.settings.telegramSessionType) {
			plugin.settings.telegramSessionType = sessionType;
			await plugin.saveSettings();
		}

		await client.init(
			plugin.settings.telegramSessionId,
			plugin.settings.telegramSessionType,
			+plugin.settings.appId,
			plugin.settings.apiHash,
			plugin.currentDeviceId
		);

		plugin.userConnected = await client.isAuthorizedAsUser();

		if (
			plugin.settings.telegramSessionType == "bot" ||
			(plugin.settings.telegramSessionType == "user" && !plugin.userConnected && sessionId)
		) {
			await client.signInAsBot(plugin.settings.botToken);
		}
	} catch (e) {
		if (!e.message.includes("API_ID_PUBLISHED_FLOOD")) {
			if (sessionType == "user") {
				plugin.settings.telegramSessionType = initialSessionType;
				plugin.saveSettings();
			}
			await displayAndLogError(plugin, e, undefined, _15sec);
		}
	}
}

export async function reconnect(plugin: TelegramSyncPlugin, displayError = false) {
	if (plugin.checkingUserConnection) return;

	plugin.checkingUserConnection = true;
	try {
		await client.reconnect(false);
		plugin.userConnected = await client.isAuthorizedAsUser();
	} catch (e) {
		plugin.userConnected = false;
		if (displayError && plugin.botConnected && plugin.settings.telegramSessionType == "user") {
			displayAndLog(
				plugin,
				`Telegram user is disconnected.\n\nTry restore the connection manually by restarting Obsidian or by refresh button in the plugin settings!\n\n${e}`
			);
		}
	} finally {
		plugin.checkingUserConnection = false;
	}
}

// Stop connection as user
export async function disconnect(plugin: TelegramSyncPlugin) {
	try {
		await client.stop();
	} finally {
		plugin.userConnected = false;
	}
}
