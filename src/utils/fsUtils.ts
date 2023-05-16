import { TFile, Vault } from "obsidian";

// Create a folderpath if it does not exist
export async function createFolderIfNotExist(vault: Vault, folderpath: string) {
	const folder = vault.getAbstractFileByPath(folderpath);
	if (folder && !(folder instanceof TFile)) {
		return;
	}
	await vault.createFolder(folderpath);
}
