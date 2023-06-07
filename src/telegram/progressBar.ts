import TelegramBot from "node-telegram-bot-api";

export async function createProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	action: string
): Promise<TelegramBot.Message> {
	return await bot.sendMessage(msg.chat.id, action, {
		reply_to_message_id: msg.message_id,
		reply_markup: { inline_keyboard: createProgressBarKeyboard(0).inline_keyboard },
	});
}

// redraw the progress bar to current process state
export async function updateProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	progressBarMessage: TelegramBot.Message,
	total: number,
	current: number,
	previousStage: number
): Promise<number> {
	const stage = Math.ceil((current / total) * 10);
	if (previousStage == stage) return stage;
	try {
		await bot.editMessageReplyMarkup(
			{
				inline_keyboard: createProgressBarKeyboard(stage).inline_keyboard,
			},
			{ chat_id: msg.chat.id, message_id: progressBarMessage.message_id }
		);
	} catch (e) {
		console.log(e);
	}
	return stage;
}

export async function deleteProgressBar(
	bot: TelegramBot,
	msg: TelegramBot.Message,
	progressBarMessage: TelegramBot.Message
) {
	await bot.deleteMessage(msg.chat.id, progressBarMessage.message_id);
}
// Create a progress bar keyboard
export function createProgressBarKeyboard(progress: number) {
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
