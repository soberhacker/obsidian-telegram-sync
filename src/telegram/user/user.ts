import TelegramSyncPlugin from "src/main";
import * as Client from "./client";
import { StatusMessages, displayAndLogError } from "src/utils/logUtils";

export async function connect(
	plugin: TelegramSyncPlugin,
	sessionType: Client.SessionType,
	sessionId?: number,
	qrCodeContainer?: HTMLDivElement,
	password?: string,
): Promise<string | undefined> {
	if (plugin.checkingUserConnection) return;
	if (!(sessionType == "user" || plugin.settings.botToken !== "")) return;
	if (sessionType == "user" && !sessionId && !qrCodeContainer) return;

	plugin.checkingUserConnection = true;
	try {
		const newSessionId = sessionId || Client.getNewSessionId();
		if (sessionType == "bot" && !sessionId) {
			plugin.settings.telegramSessionId = newSessionId;
			plugin.settings.telegramSessionType = sessionType;
			await plugin.saveSettings();
		}

		await Client.init(newSessionId, sessionType, plugin.currentDeviceId);

		if (sessionType == "user" && qrCodeContainer) {
			await Client.signInAsUserWithQrCode(qrCodeContainer, password);
		}

		plugin.userConnected = await Client.isAuthorizedAsUser();

		if (sessionType == "bot" || !plugin.userConnected) {
			await Client.signInAsBot(plugin.settings.botToken);
		}

		if (sessionType == "user" && !plugin.userConnected) return "Connection failed. See logs";

		if (plugin.userConnected && !sessionId) {
			plugin.settings.telegramSessionId = newSessionId;
			plugin.settings.telegramSessionType = sessionType;
			await plugin.saveSettings();
		}
	} catch (error) {
		if (!error.message.includes("API_ID_PUBLISHED_FLOOD")) {
			plugin.userConnected = false;
			await displayAndLogError(plugin, error, "", "", undefined, 0);
			return "Connection failed: " + error.message;
		}
	} finally {
		plugin.checkingUserConnection = false;
	}
}

export async function reconnect(plugin: TelegramSyncPlugin, displayError = false) {
	if (plugin.checkingUserConnection) return;
	plugin.checkingUserConnection = true;
	try {
		await Client.reconnect(false);
		plugin.userConnected = await Client.isAuthorizedAsUser();
	} catch (error) {
		plugin.userConnected = false;
		if (displayError && plugin.isBotConnected() && plugin.settings.telegramSessionType == "user") {
			await displayAndLogError(
				plugin,
				error,
				StatusMessages.USER_DISCONNECTED,
				"Try restore the connection manually by restarting Obsidian or by refresh button in the plugin settings!",
			);
		}
	} finally {
		plugin.checkingUserConnection = false;
	}
}

// Stop connection as user
export async function disconnect(plugin: TelegramSyncPlugin) {
	try {
		await Client.stop();
	} finally {
		plugin.userConnected = false;
	}
}
