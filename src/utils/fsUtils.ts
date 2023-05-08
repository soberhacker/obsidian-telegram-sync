import { TFolder, Vault } from 'obsidian';

/**
 * Create a folderpath if it does not exist
 */
export async function createFolder(vault: Vault, folderpath: string) {
    const folder = vault.getAbstractFileByPath(folderpath);
    if (folder && folder instanceof TFolder) {
        return;
    }
    await vault.createFolder(folderpath);
}
