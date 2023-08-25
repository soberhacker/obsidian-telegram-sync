// Credits go to Liam's Periodic Notes Plugin: https://github.com/liamcain/obsidian-periodic-notes

import { TAbstractFile, TFile } from "obsidian";
import { TextInputSuggest } from "./suggest";
import TelegramSyncPlugin from "src/main";

export class FileSuggest extends TextInputSuggest<TFile> {
	constructor(
		public inputEl: HTMLInputElement,
		private plugin: TelegramSyncPlugin,
	) {
		super(inputEl);
	}

	getSuggestions(input_str: string): TFile[] {
		const all_files = app.vault.getAllLoadedFiles();

		if (!all_files) {
			return [];
		}

		const files: TFile[] = [];
		const lower_input_str = input_str.toLowerCase();

		all_files.forEach((file: TAbstractFile) => {
			if (file instanceof TFile && file.extension === "md" && file.path.toLowerCase().contains(lower_input_str)) {
				files.push(file);
			}
		});

		return files;
	}

	renderSuggestion(file: TFile, el: HTMLElement): void {
		el.setText(file.path);
	}

	selectSuggestion(file: TFile): void {
		this.inputEl.value = file.path;
		this.inputEl.trigger("input");
		this.close();
	}
}
