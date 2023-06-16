import { Api, TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
// import QRCode from "qrcode";
import { PromisedWebSockets } from "telegram/extensions/PromisedWebSockets";
import TelegramBot from "node-telegram-bot-api";
import { convertBotFileToMessageMedia } from "./convertBotFileToMessageMedia";
import { pluginVersion, sessionName } from "release-notes.mjs";
import os from "os";
import { createProgressBar, deleteProgressBar, updateProgressBar } from "../progressBar";

let client: TelegramClient;
let botUser: Api.TypeUser | undefined;
let _apiId: number;
let _apiHash: string;
let _botToken: string | undefined;
let inputPeerUser: Api.InputPeerUser;

export async function initClient(apiId: number, apiHash: string, deviceId: string) {
	stopClient();
	if (_apiId !== apiId || _apiHash !== apiHash) {
		const session = new StoreSession(`${sessionName}_${deviceId}`);
		_apiId = apiId;
		_apiHash = apiHash;
		client = new TelegramClient(session, apiId, apiHash, {
			connectionRetries: 5,
			deviceModel: `Telegram Sync Plugin ${os.type()}`,
			appVersion: pluginVersion,
			useWSS: true,
			networkSocket: PromisedWebSockets,
		});
	}

	if (!client.connected) {
		await client.connect();
	}
}

// ?TODO add after entering password and sign in button in setting
// npm i qrcode
// npm install --save @types/qrcode
// export async function signInUser(botName?: string, password?: string, container?: HTMLDivElement) {
// 	if (!(await client.checkAuthorization()) && container) {
// 		await client.signInUserWithQrCode(
// 			{ apiId: _apiId, apiHash: _apiHash },
// 			{
// 				qrCode: async (qrCode) => {
// 					const url = "tg://login?token=" + qrCode.token.toString("base64");
// 					let qrCodeSvg = await QRCode.toString(url, { type: "svg" });
// 					qrCodeSvg = qrCodeSvg.replace("<svg", `<svg width="${150}" height="${150}"`);
// 					container.innerHTML = qrCodeSvg;
// 				},
// 				password: async (hint) => {
// 					return password ? password : "";
// 				},
// 				onError: (error) => {
// 					container.innerHTML = error.message;
// 					console.log(error);
// 				},
// 			}
// 		);
// 	}

// 	if (await client.checkAuthorization()) {
// 		const searchResult = await client.invoke(
// 			new Api.contacts.ResolveUsername({
// 				username: botName,
// 			})
// 		);

// 		// eslint-disable-next-line @typescript-eslint/no-explicit-any
// 		const botUser: any = searchResult.users[0];
// 		inputPeerUser = new Api.InputPeerUser({ userId: botUser.id, accessHash: botUser.accessHash });
// 	}
// }

export async function signInBot(botToken: string) {
	if (!(await client.checkAuthorization()) || _botToken != botToken) {
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
			.then(async (bot_user) => {
				botUser = bot_user;
				_botToken = botToken;
				inputPeerUser = new Api.InputPeerUser({
					userId: botUser.id,
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					accessHash: (botUser as any).accessHash,
				});
				return bot_user;
			})
			.catch((e) => {
				botUser = undefined;
				_botToken = undefined;
				throw new Error(e);
			});
	}
}

// download files > 20MB
export async function downloadMedia(bot: TelegramBot, botMsg: TelegramBot.Message, fileId: string, fileSize: number) {
	if (!(await client.checkAuthorization())) {
		throw new Error("Not authorized as Bot Client");
	}

	const progressBarMessage = await createProgressBar(bot, botMsg, "downloading");
	let stage = 0;
	return await client
		.downloadMedia(convertBotFileToMessageMedia(fileId || "", fileSize), {
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

// ?TODO integrate after signInUser integration
export async function sendReaction(botMsg: TelegramBot.Message) {
	const messages = await client.getMessages(inputPeerUser);

	const clientMsg = messages.find((m) => m.text == botMsg.text);

	await client.invoke(
		new Api.messages.SendReaction({
			peer: inputPeerUser,
			msgId: clientMsg?.id,
			reaction: [new Api.ReactionEmoji({ emoticon: "👍" })],
		})
	);
}

// Stop the bot polling
export async function stopClient() {
	if (client) {
		await client.destroy();
	}
}
