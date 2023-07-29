import { Api, TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
import { PromisedWebSockets } from "telegram/extensions/PromisedWebSockets";
import { version } from "release-notes.mjs";
import TelegramBot from "node-telegram-bot-api";
import QRCode from "qrcode";
import os from "os";
import { convertBotFileToMessageMedia } from "./convertBotFileToMessageMedia";
import { ProgressBarType, _3MB, createProgressBar, deleteProgressBar, updateProgressBar } from "../bot/progressBar";
import { getInputPeer, getMessage } from "./convertors";
import { formatDateTime } from "src/utils/dateUtils";
import { LogLevel, Logger } from "telegram/extensions/Logger";
import { _1min, _5sec } from "src/utils/logUtils";
import * as config from "./config";

export type SessionType = "bot" | "user";

let client: TelegramClient | undefined;
let _botToken: string | undefined;
let _sessionType: SessionType;
let _sessionId: number;
let _clientUser: Api.User | undefined;
let _voiceTranscripts: Map<string, string> | undefined;
let lastReconnectTime = new Date();

const NotConnected = new Error("Can't connect to the Telegram Api");
const NotAuthorized = new Error("Not authorized");
const NotAuthorizedAsUser = new Error("Not authorized as user. You have to connect as user");

export function getNewSessionId(): number {
	return Number(formatDateTime(new Date(), "YYYYMMDDHHmmssSSS"));
}

// Stop the bot polling
export async function stop() {
	try {
		if (client) {
			client.setLogLevel(LogLevel.NONE);
			await client.destroy();
		}
	} catch {
		/* empty */
	} finally {
		client = undefined;
		_botToken = undefined;
		_voiceTranscripts = undefined;
	}
}

// init and connect to Telegram Api
export async function init(sessionId: number, sessionType: SessionType, deviceId: string) {
	if (!client || _sessionType !== sessionType || _sessionId !== sessionId) {
		await stop();
		const session = new StoreSession(`${sessionType}_${sessionId}_${deviceId}`);
		_sessionId = sessionId;
		_sessionType = sessionType;
		client = new TelegramClient(session, config.dIipa, config.hsaHipa, {
			connectionRetries: 2,
			deviceModel: os.hostname() || os.type(),
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
			if (!authorized) _clientUser = undefined;
			else if (!_clientUser && authorized) _clientUser = (await client.getMe()) as Api.User;
		} catch (e) {
			if (sessionType == "user") {
				await init(_sessionId, "bot", deviceId);
				throw new Error(`Login as user failed. Error: ${e}`);
			} else throw e;
		}
	}
}

export async function reconnect(checkInterval = true): Promise<boolean> {
	if (!client) return false;
	if (!client.connected && (!checkInterval || new Date().getTime() - lastReconnectTime.getTime() >= _1min)) {
		lastReconnectTime = new Date();
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
				apiId: config.dIipa,
				apiHash: config.hsaHipa,
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
	if ((await client.checkAuthorization()) && (await client.isBot()))
		throw new Error("User session is missed. Try to restart the plugin or Obsidian");
	await client
		.signInUserWithQrCode(
			{ apiId: config.dIipa, apiHash: config.hsaHipa },
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

async function checkBotService(): Promise<TelegramClient> {
	if (!client || !(await reconnect())) throw NotConnected;
	if (!(await client.checkAuthorization())) throw NotAuthorized;
	return client;
}

async function checkUserService(): Promise<{ checkedClient: TelegramClient; checkedUser: Api.User }> {
	const checkedClient = await checkBotService();
	if ((await checkedClient.isBot()) || !_clientUser) throw NotAuthorizedAsUser;
	return { checkedClient, checkedUser: _clientUser };
}

// download files > 20MB
export async function downloadMedia(
	bot: TelegramBot,
	botMsg: TelegramBot.Message,
	fileId: string,
	fileSize: number,
	botUser?: TelegramBot.User
) {
	const checkedClient = await checkBotService();

	// user clients needs different file id
	let stage = 0;
	let message: Api.Message | undefined = undefined;
	if (_clientUser && botUser && (await isAuthorizedAsUser())) {
		const inputPeer = await getInputPeer(checkedClient, _clientUser, botUser, botMsg);
		message = await getMessage(checkedClient, inputPeer, botMsg);
	}

	const progressBarMessage =
		fileSize > _3MB ? await createProgressBar(bot, botMsg, ProgressBarType.downloading) : undefined;
	return await checkedClient
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

const sendReactionMsgGroupsToSkip: string[] = [];

export async function sendReaction(botUser: TelegramBot.User, botMsg: TelegramBot.Message, emoticon: string) {
	// if files are grouped they can have only one reaction
	if (botMsg.media_group_id)
		if (sendReactionMsgGroupsToSkip.contains(botMsg.media_group_id)) return;
		else sendReactionMsgGroupsToSkip.push(botMsg.media_group_id);
	try {
		const { checkedClient, checkedUser } = await checkUserService();
		const inputPeer = await getInputPeer(checkedClient, checkedUser, botUser, botMsg);
		const message = await getMessage(checkedClient, inputPeer, botMsg);
		await checkedClient.invoke(
			new Api.messages.SendReaction({
				peer: inputPeer,
				msgId: message.id,
				reaction: [new Api.ReactionEmoji({ emoticon })],
			})
		);
	} catch (error) {
		if (botMsg.media_group_id && error.message == "400: MESSAGE_NOT_MODIFIED (caused by messages.SendReaction)")
			return;
		else if (botMsg.media_group_id) sendReactionMsgGroupsToSkip.remove(botMsg.media_group_id);
		throw error;
	}
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

	const { checkedClient, checkedUser } = await checkUserService();
	if (!checkedUser.premium) {
		throw new Error(
			"Transcribing voices available only for Telegram Premium subscribers! Remove {{voiceTranscript}} from current template or log in with a premium user."
		);
	}
	if (!botUser) return "";
	const inputPeer = await getInputPeer(checkedClient, checkedUser, botUser, botMsg);
	const message = await getMessage(checkedClient, inputPeer, botMsg, mediaId);
	let transcribedAudio: Api.messages.TranscribedAudio | undefined;
	// to avoid endless loop, limited waiting
	for (let i = 1; i <= limit * 14; i++) {
		transcribedAudio = await checkedClient.invoke(
			new Api.messages.TranscribeAudio({
				peer: inputPeer,
				msgId: message.id,
			})
		);
		if (transcribedAudio.pending)
			await new Promise((resolve) => setTimeout(resolve, _5sec)); // 5 sec delay between updates
		else if (i == limit * 14) throw new Error("Very long audio. Transcribing can't be longer then 15 min lasting.");
		else break;
	}
	if (!transcribedAudio) throw new Error("Can't transcribe the audio");
	if (!_voiceTranscripts.has(`${botMsg.chat.id}_${botMsg.message_id}`))
		_voiceTranscripts.set(`${botMsg.chat.id}_${botMsg.message_id}`, transcribedAudio.text);
	return transcribedAudio.text;
}
