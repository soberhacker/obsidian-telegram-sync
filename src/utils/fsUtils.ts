import { TFile, TFolder, Vault, normalizePath } from "obsidian";

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

export function base64ToString(base64: string): string {
	return Buffer.from(base64, "base64").toString("utf-8");
}
