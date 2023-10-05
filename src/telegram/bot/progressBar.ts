import TelegramBot from "node-telegram-bot-api";
import { checkIfTooManyRequests, isTooManyRequests } from "./tooManyRequests";

export enum ProgressBarType {
	DOWNLOADING = "downloading",
	DELETING = "deleting",
	STORED = "stored",
	TRANSCRIBING = "transcribing",
}

export const _3MB = 3 * 1024 * 1024;

export async function createProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	action: ProgressBarType,
): Promise<TelegramBot.Message | undefined> {
	return await bot.sendMessage(msg.chat.id, action, {
		reply_to_message_id: msg.message_id,
		reply_markup: { inline_keyboard: createProgressBarKeyboard(0).inline_keyboard },
		disable_notification: true,
	});
}

// redraw the progress bar to current process state
export async function updateProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	progressBarMessage: TelegramBot.Message | undefined,
	total: number,
	current: number,
	previousStage: number,
): Promise<number> {
	if (!progressBarMessage) return 0;
	const stage = Math.ceil((current / total) * 10);
	if (previousStage == stage || isTooManyRequests) return stage;
	try {
		await bot.editMessageReplyMarkup(
			{
				inline_keyboard: createProgressBarKeyboard(stage).inline_keyboard,
			},
			{ chat_id: msg.chat.id, message_id: progressBarMessage.message_id },
		);
	} catch (e) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		if (!checkIfTooManyRequests(e)) console.log(e);
	}
	return stage;
}

export async function deleteProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	progressBarMessage: TelegramBot.Message | undefined,
) {
	if (!progressBarMessage) return;
	await bot.deleteMessage(msg.chat.id, progressBarMessage.message_id);
}
// Create a progress bar keyboard
function createProgressBarKeyboard(progress: number) {
	const progressBar = "▓".repeat(progress) + "░".repeat(10 - progress);
	return {
		inline_keyboard: [
			[
				{
					text: progressBar,
					callback_data: JSON.stringify({ action: "update_progress", progress: progress }),
				},
			],
		],
	};
}
