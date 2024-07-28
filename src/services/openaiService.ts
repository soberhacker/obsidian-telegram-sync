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

import { v2 as cloudinary } from "cloudinary";

// Настройка Cloudinary
cloudinary.config({
	cloud_name: "YOUR_CLOUD_NAME",
	api_key: "YOUR_API_KEY",
	api_secret: "YOUR_API_SECRET", // Замените на ваш API секрет
});

// Функция для конвертации Base64 в Buffer
function base64ToBuffer(base64: string): Buffer {
	const binaryString = atob(base64); // Декодируем Base64 в бинарную строку
	const len = binaryString.length;
	const bytes = new Uint8Array(len); // Создаем массив байтов
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i); // Заполняем массив байтами
	}
	return Buffer.from(bytes); // Возвращаем Buffer
}

export async function generateImage(plugin: TelegramSyncPlugin, prompt: string) {
	try {
		const apiKey = plugin.settings.openAIKey;
		const model = plugin.settings.openAIImageModel;

		if (!apiKey) {
			throw new Error("OpenAI API key is not set. Please provide your API key in the settings.");
		}

		if (!model) {
			throw new Error("OpenAI Image model is not set. Please provide the model in the settings.");
		}

		const openai = new OpenAI({
			apiKey: apiKey,
			dangerouslyAllowBrowser: true,
		});

		const response = await openai.images.generate({
			prompt: prompt,
			model: model,
			quality: "standard",
			n: 1,
			size: "512x512",
			response_format: "b64_json",
		});

		// @ts-ignore
		const base64Image = response.data[0].b64_json;

		// Конвертирование Base64 в Buffer
		// @ts-ignore
		const imageBuffer = base64ToBuffer(base64Image);

		// Загрузка изображения в Cloudinary
		const uploadResult = await new Promise((resolve, reject) => {
			cloudinary.uploader
				.upload_stream(
					{ public_id: `generated_image_${Date.now()}`, resource_type: "image", format: "png" }, // Используем уникальный public_id
					(error, result) => {
						if (error) {
							reject(error);
						} else {
							resolve(result);
						}
					},
				)
				.end(imageBuffer);
		});

		// Ссылка на загруженное изображение
		// @ts-ignore
		const imageUrl = uploadResult.secure_url;

		// Логирование ссылки
		console.log("Image URL:", imageUrl);

		// Возвращаем URL изображения
		return imageUrl;
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
