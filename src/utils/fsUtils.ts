import { TFile, TFolder, Vault, normalizePath } from "obsidian";
import { date2DateString, date2TimeString } from "./dateUtils";

// Create a folderpath if it does not exist
export async function createFolderIfNotExist(vault: Vault, folderpath: string) {
	if (!vault || !folderpath) {
		return;
	}
	const folder = vault.getAbstractFileByPath(normalizePath(folderpath));

	if (folder && folder instanceof TFolder) {
		return;
	}

	if (folder && folder instanceof TFile) {
		throw new URIError(
			`Folder "${folderpath}" can't be created because there is a file with the same name. Change the path or rename the file.`
		);
	}

	await vault.createFolder(folderpath).catch((error) => {
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
	unixTime: number
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
		fileName = `${title} - ${messageDateString}${fileId}.${_fileExtension}}`;
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

export function base64ToString(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}
