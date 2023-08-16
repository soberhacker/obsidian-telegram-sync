import TelegramSyncPlugin from "src/main";
import * as client from "./client";
import { StatusMessages, displayAndLogError } from "src/utils/logUtils";
import * as release from "release-notes.mjs";

export async function connect(plugin: TelegramSyncPlugin, sessionType: client.SessionType, sessionId?: number) {
	// TODO in 2024: remove this condition
	// Api keys were changed so needed some adaptation
	if (
		sessionType == "user" &&
		!release.showBreakingChanges &&
		release.versionALessThanVersionB(plugin.settings.pluginVersion, "1.9.0")
	) {
		sessionType = "bot";
		plugin.settings.telegramSessionType = "bot";
		await plugin.saveSettings();
		release.showBreakingChangesInReleaseNotes();
	}

	if (release.versionALessThanVersionB(plugin.settings.pluginVersion, "1.10.0"))
		localStorage.removeItem("GramJs:apiCache");

	if (!(sessionType == "user" || plugin.settings.botToken !== "")) return;

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
			plugin.currentDeviceId,
		);

		plugin.botStateSetTo(await client.isAuthorizedAsUser());

		if (
			plugin.settings.telegramSessionType == "bot" ||
			(plugin.settings.telegramSessionType == "user" && !plugin.userConnected && sessionId)
		) {
			await client.signInAsBot(plugin.settings.botToken);
		}
	} catch (error) {
		if (!error.message.includes("API_ID_PUBLISHED_FLOOD")) {
			if (sessionType == "user") {
				plugin.settings.telegramSessionType = initialSessionType;
				plugin.saveSettings();
			}
			await displayAndLogError(plugin, error, "", "", undefined, 0);
		}
	}
}

export async function reconnect(plugin: TelegramSyncPlugin, displayError = false) {
	if (plugin.checkingUserConnection) return;
	plugin.checkingUserConnection = true;
	try {
		await client.reconnect(false);
		plugin.botStateSetTo(await client.isAuthorizedAsUser());
	} catch (error) {
		plugin.botStateSetToDisconnected();
		if (displayError && plugin.botIsConnected() && plugin.settings.telegramSessionType == "user") {
			await displayAndLogError(
				plugin,
				error,
				StatusMessages.userDisconnected,
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
		await client.stop();
	} finally {
		plugin.botStateSetToDisconnected();
		plugin.checkingUserConnection = false;
	}
}
