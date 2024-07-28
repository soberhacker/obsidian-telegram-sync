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

export async function generateImage(plugin: TelegramSyncPlugin, prompt: string): Promise<string> {
	try {
		const apiKey = plugin.settings.openAIKey; // Достаем API ключ из настроек
		const model = plugin.settings.openAIImageModel; // Достаем модель для генерации изображений

		if (!apiKey) {
			throw new Error("OpenAI API key is not set. Please provide your API key in the settings.");
		}

		if (!model) {
			throw new Error("OpenAI Image model is not set. Please provide the model in the settings.");
		}

		const openai = new OpenAI({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true, // Используйте с осторожностью
		});

		const response = await openai.images.generate({
			prompt: prompt,
			model: model,
			n: 1, // Количество изображений для генерации
			size: "1024x1024", // Размер изображения
			response_format: `url`,
		});

		// @ts-ignore
		return response.data[0].url; // Возвращаем URL сгенерированного изображения
	} catch (error) {
		console.error("Error generating image with OpenAI API:", error);
		return "An error occurred while generating the image.";
	}
}

// export async function generateAudio(plugin: TelegramSyncPlugin, prompt: string): Promise<string> {
// 	try {
// 		const apiKey = plugin.settings.openAIKey; // Достаем API ключ из настроек
// 		const model = plugin.settings.openAIAudioModel || "tts-1"; // Достаем модель для генерации аудио
// 		const voice = plugin.settings.openAIAudioVoice || "nova"; // Достаем голос для генерации аудио
//
// 		if (!apiKey) {
// 			throw new Error("OpenAI API key is not set. Please provide your API key in the settings.");
// 		}
//
// 		const openai = new Speech({
// 			apiKey: apiKey,
// 		});
//
// 		const response = await openai.create({
// 			input: prompt,
// 			model: model,
// 			voice: voice,
// 			response_format: "mp3", // Формат аудио
// 		});
//
// 		if (response) {
// 			return URL.createObjectURL(response.data); // Создание URL для аудио файла
// 		} else {
// 			throw new Error("No response from OpenAI API.");
// 		}
// 	} catch (error) {
// 		console.error("Error generating audio with OpenAI API:", error);
// 		return "An error occurred while generating the audio.";
// 	}
// }
