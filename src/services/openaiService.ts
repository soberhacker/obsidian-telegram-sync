import OpenAI from "openai";
import TelegramSyncPlugin from "../main";
const systemMessage =
	"Я создаю приложение для превращения английского слова в флэш-карту. \nТ.е я буду создавать связь \nСлово  - описание слова и примеры использования слова в речи.\nДля этого я буду использовать тебя.\nНе должно быть пропусков между строками. Это очень важно. Никаких пропусков между строками. Ни одной пустой строки.\nНА любое слово или фразу отвечай как дальше\n\n Примечание: не должно быть ни одной пустой строки, никаких пропусков, тк это сломает приложение\nПример запроса:\nanger. Пример ответа: Anger\n—\n## Description of Anger:\n<A very simple explanation of what the meaning of the word>\n## Examples of Usage:\n1. <Use of a word in a phrase>\n2. <Use of a word in a phrase>\n...\n## Audio\n## Illustration";

export async function generateText(plugin: TelegramSyncPlugin, prompt: string): Promise<string> {
	try {
		const apiKey = plugin.settings.openAIKey; // Достаем API ключ из настроек

		if (!apiKey) {
			throw new Error("OpenAI API key is not set. Please provide your API key in the settings.");
		}

		const openai = new OpenAI({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true, // Используйте с осторожностью
		});

		const response = await openai.chat.completions.create({
			messages: [
				{ role: "system", content: systemMessage },
				{ role: "user", content: prompt },
			],
			model: plugin.settings.openAIModel,
		});

		// @ts-ignore
		return response.choices[0].message.content.trim();
	} catch (error) {
		console.error("Error generating text with OpenAI API:", error);
		return "An error occurred while processing your request.";
	}
}
