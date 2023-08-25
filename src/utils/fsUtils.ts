import { TFile, TFolder, Vault, normalizePath } from "obsidian";
import { date2DateString, date2TimeString } from "./dateUtils";

export const defaultDelimiter = "\n\n***\n\n";

// Create a folder path if it does not exist
export async function createFolderIfNotExist(vault: Vault, folderPath: string) {
	if (!vault || !folderPath) {
		return;
	}
	const folder = vault.getAbstractFileByPath(normalizePath(folderPath));

	if (folder && folder instanceof TFolder) {
		return;
	}

	if (folder && folder instanceof TFile) {
		throw new URIError(
			`Folder "${folderPath}" can't be created because there is a file with the same name. Change the path or rename the file.`,
		);
	}

	await vault.createFolder(folderPath).catch((error) => {
		if (error.message !== "Folder already exists.") {
			throw error;
		}
	});
}

export function sanitizeFileName(fileName: string): string {
	const invalidCharacters = /[\\/:*?"<>|\n\r]/g;
	const replacementCharacter = "_";
	return fileName.replace(invalidCharacters, replacementCharacter);
}

export async function getUniqueFilePath(
	vault: Vault,
	generatedFilePaths: string[],
	locationPath: string,
	baseForFileName: string,
	fileExtension: string, // with dot
	unixTime: number,
): Promise<string> {
	const _fileExtension = fileExtension.startsWith(".") ? fileExtension.slice(1) : fileExtension;
	await createFolderIfNotExist(vault, locationPath);
	const title = sanitizeFileName(baseForFileName.slice(0, 30));
	const messageDate = new Date(unixTime * 1000);
	const messageDateString = date2DateString(messageDate);
	let fileId = Number(date2TimeString(messageDate));
	let fileName = `${title} - ${messageDateString}${fileId}.${_fileExtension}`;
	let filePath = normalizePath(locationPath ? `${locationPath}/${fileName}` : fileName);
	let previousFilePath = "";
	while (
		previousFilePath != filePath &&
		(generatedFilePaths.includes(filePath) || vault.getAbstractFileByPath(filePath) instanceof TFile)
	) {
		previousFilePath = filePath;
		fileId += 1;
		fileName = `${title} - ${messageDateString}${fileId}.${_fileExtension}`;
		filePath = normalizePath(locationPath ? `${locationPath}/${fileName}` : fileName);
	}
	generatedFilePaths.push(filePath);
	return filePath;
}

export function getTelegramMdPath(vault: Vault, location: string) {
	// Determine the location for the Telegram.md file
	createFolderIfNotExist(vault, location);
	const telegramMdPath = normalizePath(location ? `${location}/Telegram.md` : "Telegram.md");
	return telegramMdPath;
}

export async function appendContentToNote(
	vault: Vault,
	notePath: string,
	newContent: string,
	startLine = "",
	delimiter = defaultDelimiter,
	reversedOrder = false,
) {
	let noteFile: TFile = vault.getAbstractFileByPath(notePath) as TFile;

	if (!noteFile) {
		noteFile = await vault.create(notePath, newContent);
	} else {
		const currentContent = await vault.read(noteFile);
		const content = startLine
			? currentContent.replace(startLine, startLine + delimiter + newContent)
			: reversedOrder
			? newContent + delimiter + currentContent
			: currentContent + delimiter + newContent;
		if (currentContent != content) await vault.modify(noteFile, content);
	}
}

export function base64ToString(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}

export async function replaceMainJs(vault: Vault, mainJs: Buffer | "main-prod.js") {
	const mainJsPath = normalizePath(vault.configDir + "/plugins/telegram-sync/main.js");
	const mainProdJsPath = normalizePath(vault.configDir + "/plugins/telegram-sync/main-prod.js");
	if (mainJs instanceof Buffer) {
		await vault.adapter.writeBinary(mainProdJsPath, await vault.adapter.readBinary(mainJsPath));
		await vault.adapter.writeBinary(mainJsPath, mainJs);
	} else {
		if (!(await vault.adapter.exists(mainProdJsPath))) return;
		await vault.adapter.writeBinary(mainJsPath, await vault.adapter.readBinary(mainProdJsPath));
	}
}
