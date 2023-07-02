import { Api, TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
import { PromisedWebSockets } from "telegram/extensions/PromisedWebSockets";
import { version } from "release-notes.mjs";
import TelegramBot from "node-telegram-bot-api";
import QRCode from "qrcode";
import os from "os";
import { convertBotFileToMessageMedia } from "./convertBotFileToMessageMedia";
import { createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";
import { getInputPeerUser, getMessage } from "./convertors";
import { formatDateTime } from "src/utils/dateUtils";
import { LogLevel, Logger } from "telegram/extensions/Logger";

export type SessionType = "bot" | "user";

let client: TelegramClient | undefined;
let _apiId: number;
let _apiHash: string;
let _botToken: string | undefined;
let _sessionType: SessionType;
let _sessionId: number;
let _clientUser: Api.User | undefined;
let _voiceTranscripts: Map<string, string> | undefined;

// change session name when changes in plugin require new client authorization
const sessionName = "telegram_sync_170";
const NotConnected = new Error("Can't connect to the Telegram Api");
const NotAuthorized = new Error("Not authorized");
const NotAuthorizedAsUser = new Error("Not authorized as user. You have to log in as user, not as bot");

export function getNewSessionId(): number {
	return Number(formatDateTime(new Date(), "YYYYMMDDHHmmssSSS"));
}

// Stop the bot polling
export async function stop() {
	if (client) {
		await client.destroy();
		client = undefined;
		_botToken = undefined;
		_voiceTranscripts = undefined;
	}
}

// init and connect to Telegram Api
export async function init(
	sessionId: number,
	sessionType: SessionType,
	apiId: number,
	apiHash: string,
	deviceId: string
) {
	if (
		!client ||
		_apiId !== apiId ||
		_apiHash !== apiHash ||
		_sessionType !== sessionType ||
		_sessionId !== sessionId
	) {
		await stop();
		const session = new StoreSession(`${sessionType}_${sessionId}_${sessionName}_${deviceId}`);
		_apiId = apiId;
		_apiHash = apiHash;
		_sessionId = sessionId;
		_sessionType = sessionType;
		client = new TelegramClient(session, apiId, apiHash, {
			connectionRetries: 2,
			deviceModel: `Obsidian Telegram Sync ${os.type().replace("_NT", "")}`,
			appVersion: version,
			useWSS: true,
			networkSocket: PromisedWebSockets,
			baseLogger: new Logger(LogLevel.ERROR),
		});
	}

	if (!client) throw NotConnected;
	if (!client.connected) {
		try {
			await client.connect();
			const authorized = await client.checkAuthorization();
			if (sessionType == "user" && authorized && (await client.isBot()))
				throw new Error("Stored session conflict. Try to log in again.");
			if (!_clientUser && authorized) _clientUser = (await client.getMe()) as Api.User;
		} catch (e) {
			if (sessionType == "user") {
				await init(_sessionId, "bot", apiId, apiHash, deviceId);
				throw new Error(`Login as user failed. Error: ${e}`);
			} else throw e;
		}
	}
}

export async function reconnect(): Promise<boolean> {
	if (!client) return false;
	if (!client.connected) {
		await client.connect();
	}
	return client.connected || false;
}

export async function isAuthorizedAsUser(): Promise<boolean> {
	return (client && (await client.checkAuthorization()) && !(await client.isBot())) || false;
}

export async function signInAsBot(botToken: string) {
	if (!client) throw NotConnected;
	if (await client.checkAuthorization()) {
		if (!(await client.isBot())) throw new Error("Bot session is missed");
		if (!_botToken) _botToken = botToken;
		if (_botToken == botToken) return;
	}
	await client
		.signInBot(
			{
				apiId: _apiId,
				apiHash: _apiHash,
			},
			{
				botAuthToken: botToken,
			}
		)
		.then(async (botUser) => {
			_botToken = botToken;
			_clientUser = botUser as Api.User;
			return botUser;
		})
		.catch((e) => {
			_botToken = undefined;
			_clientUser = undefined;
			throw new Error(e);
		});
}

export async function signInAsUserWithQrCode(container: HTMLDivElement, password?: string) {
	if (!client) throw NotConnected;
	if ((await client.checkAuthorization()) && (await client.isBot())) new Error("User session is missed");
	await client
		.signInUserWithQrCode(
			{ apiId: _apiId, apiHash: _apiHash },
			{
				qrCode: async (qrCode) => {
					const url = "tg://login?token=" + qrCode.token.toString("base64");
					const qrCodeSvg = await QRCode.toString(url, { type: "svg" });
					const parser = new DOMParser();
					const svg = parser.parseFromString(qrCodeSvg, "image/svg+xml").documentElement;
					svg.setAttribute("width", "150");
					svg.setAttribute("height", "150");
					// Removes all children from `container`
					while (container.firstChild) {
						container.removeChild(container.firstChild);
					}
					container.appendChild(svg);
				},
				password: async (hint) => {
					return password ? password : "";
				},
				onError: (error) => {
					container.setText(error.message);
					console.log(error);
				},
			}
		)
		.then((clientUser) => {
			_clientUser = clientUser as Api.User;
			return clientUser;
		})
		.catch(() => {
			_clientUser = undefined;
		});
}

// download files > 20MB
export async function downloadMedia(
	bot: TelegramBot,
	botMsg: TelegramBot.Message,
	fileId: string,
	fileSize: number,
	botUser?: TelegramBot.User
) {
	if (!client) throw NotConnected;
	if (!(await client.checkAuthorization())) throw NotAuthorized;

	// user clients needs different file id
	let stage = 0;
	let message: Api.Message | undefined = undefined;
	if (_clientUser && botUser && (await isAuthorizedAsUser())) {
		const inputPeerUser = await getInputPeerUser(client, _clientUser, botUser, botMsg);
		message = await getMessage(client, inputPeerUser, botMsg);
	}

	const progressBarMessage = await createProgressBar(bot, botMsg, "downloading");
	return await client
		.downloadMedia(message || convertBotFileToMessageMedia(fileId || "", fileSize), {
			progressCallback: async (receivedBytes, totalBytes) => {
				stage = await updateProgressBar(
					bot,
					botMsg,
					progressBarMessage,
					totalBytes.toJSNumber() || fileSize,
					receivedBytes.toJSNumber(),
					stage
				);
			},
		})
		.then(async (data) => {
			return data;
		})
		.finally(async () => {
			await deleteProgressBar(bot, botMsg, progressBarMessage);
		});
}

export async function sendReaction(botUser: TelegramBot.User, botMsg: TelegramBot.Message) {
	if (!client || !(await client.checkAuthorization())) throw NotConnected;
	if ((await client.isBot()) || !_clientUser) throw NotAuthorizedAsUser;
	const inputPeerUser = await getInputPeerUser(client, _clientUser, botUser, botMsg);
	const message = await getMessage(client, inputPeerUser, botMsg);
	await client.invoke(
		new Api.messages.SendReaction({
			peer: inputPeerUser,
			msgId: message.id,
			reaction: [new Api.ReactionEmoji({ emoticon: "👍" })],
		})
	);
}

export async function transcribeAudio(
	botMsg: TelegramBot.Message,
	botUser?: TelegramBot.User,
	mediaId?: string,
	limit = 15 // minutes for waiting transcribing (not for the audio)
): Promise<string> {
	if (botMsg.text || !(botMsg.voice || botMsg.video_note)) {
		return "";
	}
	if (!_voiceTranscripts) _voiceTranscripts = new Map();
	if (_voiceTranscripts.size > 100) _voiceTranscripts.clear();
	if (_voiceTranscripts.has(`${botMsg.chat.id}_${botMsg.message_id}`))
		return _voiceTranscripts.get(`${botMsg.chat.id}_${botMsg.message_id}`) || "";

	if (!client || !(await client.checkAuthorization())) throw NotConnected;
	if ((await client.isBot()) || !_clientUser) throw NotAuthorizedAsUser;
	if (!_clientUser.premium) {
		throw new Error(
			"Transcribing voices available only for Telegram Premium subscribers! Remove {{voice:transcript}} from current template or log in with a premium user."
		);
	}
	if (!botUser) return "";
	const inputPeerUser = await getInputPeerUser(client, _clientUser, botUser, botMsg);
	const message = await getMessage(client, inputPeerUser, botMsg, mediaId);
	let transcribedAudio: Api.messages.TranscribedAudio | undefined;
	// to avoid endless loop, limited waiting
	for (let i = 1; i <= limit * 14; i++) {
		transcribedAudio = await client.invoke(
			new Api.messages.TranscribeAudio({
				peer: inputPeerUser,
				msgId: message.id,
			})
		);
		if (transcribedAudio.pending)
			await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 sec delay between updates
		else if (i == limit * 14) throw new Error("Very long audio. Transcribing audio is limited with 15 min.");
		else break;
	}
	if (!transcribedAudio) throw new Error("Can't transcribe the audio");
	if (!_voiceTranscripts.has(`${botMsg.chat.id}_${botMsg.message_id}`))
		_voiceTranscripts.set(`${botMsg.chat.id}_${botMsg.message_id}`, transcribedAudio.text);
	return transcribedAudio.text;
}
