interface FileData {
	fileType: string;
	fileObject: Blob;
}

export async function getFileFromUrl(imageUrl: string): Promise<FileData> {
	try {
		// Загрузка изображения из URL
		const response = await fetch(imageUrl);
		if (!response.ok) {
			throw new Error(`Failed to fetch image: ${response.statusText}`);
		}
		const blob = await response.blob();

		// Определение типа файла
		const fileType = blob.type;

		// Создание объекта файла
		const fileObject = blob;

		return { fileType, fileObject };
	} catch (error) {
		console.error("Error processing image:", error);
		throw error;
	}
}
