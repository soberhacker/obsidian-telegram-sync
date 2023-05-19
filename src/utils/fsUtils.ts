import { TFile, TFolder, Vault } from "obsidian";

// Create a folderpath if it does not exist
export async function createFolderIfNotExist(vault: Vault, folderpath: string) {
	if (!vault || !folderpath) {
		return;
	}
	const folder = vault.getAbstractFileByPath(folderpath);

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
