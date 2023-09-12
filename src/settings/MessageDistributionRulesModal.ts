import { Modal, normalizePath, Setting } from "obsidian";
import TelegramSyncPlugin from "../main";
import {
	defaultFileNameTemplate,
	defaultNoteNameTemplate,
	blankMessageDistributionRule,
	extractMessageFiltersFromQuery,
	MessageDistributionRule,
} from "./messageDistribution";
import { FileSuggest } from "./suggesters/FileSuggester";

export class MessageDistributionRulesModal extends Modal {
	messageDistributionRule: MessageDistributionRule;
	messageDistributionRulesDiv: HTMLDivElement;
	saved = false;
	// ro add messageDistributionRule in constructor as parameter and fill this.messageDistributionRule
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}
	// ro remove existingRule parameter
	async display(existingRule?: MessageDistributionRule) {
		this.contentEl.empty();
		this.messageDistributionRulesDiv = this.contentEl.createDiv();
		this.messageDistributionRulesDiv.createEl("h4", { text: "Message Distribution Rules settings" });
		// ro check logic here
		if (existingRule) this.messageDistributionRule = existingRule;
		else this.messageDistributionRule = blankMessageDistributionRule;
		this.addMessageFilter();
		this.addTemplateFilePath();
		this.addNotePathTemplate();
		this.addFilePathTemplate();
		this.addVariablesList();
		this.addFooterButtons();
	}

	addMessageFilter() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Message filter")
			.setDesc(
				"Conditions by which you would like to filter messages. Leave the field blank if you want to apply this rule to all messages",
			)
			.addTextArea((text) => {
				text.setValue(this.messageDistributionRule.messageFilterQuery)
					.onChange(async (value: string) => {
						this.messageDistributionRule.messageFilterQuery = value;
						this.messageDistributionRule.messageFilters = extractMessageFiltersFromQuery(value);
					})
					.setPlaceholder("example: {{topic=Notes}}{{user=soberhacker}}");
			});
	}

	addTemplateFilePath() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Template file path")
			.setDesc("Specify path to template file you want to apply to new notes")
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin);
				cb.setPlaceholder("example:  folder/zettelkasten.md")
					.setValue(this.messageDistributionRule.templateFilePath)
					.onChange(async (path) => {
						this.messageDistributionRule.templateFilePath = path ? normalizePath(path) : path;
						// ro remove saveSettings, it should be saved together with others settings
						await this.plugin.saveSettings();
					});
			});
	}

	addNotePathTemplate() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Note path template")
			// ro I remove \n because it doesn't work here and I think it's ok without
			.setDesc(
				"Specify path template for storage folders and note names. Leave empty if you don't want to create any notes from filtrated messages",
			)
			.addTextArea((text) => {
				text.setPlaceholder(`example: folder/${defaultNoteNameTemplate}`)
					.setValue(this.messageDistributionRule.notePathTemplate)
					.onChange(async (value: string) => {
						this.messageDistributionRule.notePathTemplate = value;
					});
			});
	}

	addFilePathTemplate() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("File path template")
			.setDesc(
				"Specify path template for storage folders and file names. Leave empty if you don't want to save any files from filtrated messages",
			)
			.addTextArea((text) => {
				text.setPlaceholder(`example: folder/${defaultFileNameTemplate}`)
					.setValue(this.messageDistributionRule.filePathTemplate)
					.onChange(async (value: string) => {
						this.messageDistributionRule.filePathTemplate = value;
					});
			});
	}

	addVariablesList() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Variables list")
			.setDesc("List of variables that are available to use in filters, templates and storage paths")
			.addButton((btn) => {
				btn.setButtonText("Open in browser");
				btn.onClick(() => {
					window.open(
						"https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md",
						"_blank",
					);
				});
			});
	}

	addFooterButtons() {
		const footerButtons = new Setting(this.contentEl.createDiv());
		footerButtons.addButton((b) => {
			b.setTooltip("Submit")
				.setIcon("checkmark")
				.onClick(async () => {
					if (
						// ro add check that only one should be filled
						// displayAndLog(plugin, "Text of message", _15sec);
						this.messageDistributionRule.templateFilePath &&
						this.messageDistributionRule.notePathTemplate &&
						this.messageDistributionRule.filePathTemplate
					) {
						const existingRuleIndex = this.plugin.settings.messageDistributionRules.indexOf(
							this.messageDistributionRule,
						);
						if (existingRuleIndex == -1) {
							// Push the new rule if it doesn't exist
							this.plugin.settings.messageDistributionRules.push(this.messageDistributionRule);
						}
						await this.plugin.saveSettings();
						console.log("add Button works");
						this.saved = true;
						console.log(this.plugin.settings.messageDistributionRules);
						this.close();
					}
				});
			return b;
		});
		footerButtons.addExtraButton((b) => {
			b.setIcon("cross")
				.setTooltip("Cancel")
				.onClick(async () => {
					await this.plugin.loadSettings();
					this.saved = false;
					this.close();
				});
			return b;
		});
	}

	onOpen() {
		this.display(this.messageDistributionRule);
	}
}
