import fetch from "node-fetch";
import sharp from "sharp";

interface FileData {
	fileType: string;
	fileObject: Buffer;
}

export async function getFileFromUrl(imageUrl: string): Promise<FileData> {
	try {
		// Загрузка изображения из URL
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`);
		}
		const buffer = await response.buffer();

		// Преобразование изображения в формат PNG с использованием sharp
		const pngBuffer = await sharp(buffer).png().toBuffer();

		// Определение типа файла и создание объекта файла
		const fileType = "image/png";
		const fileObject = pngBuffer;

		return { fileType, fileObject };
	} catch (error) {
		console.error("Error processing image:", error);
		throw error; // Можете обработать ошибку иначе, если нужно
	}
}
