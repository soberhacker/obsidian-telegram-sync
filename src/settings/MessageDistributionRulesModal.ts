import { Modal, normalizePath, Setting } from "obsidian";
import TelegramSyncPlugin from "../main";
import {
	defaultFileNameTemplate,
	defaultNoteNameTemplate,
	extractMessageFiltersFromQuery,
	MessageDistributionRule,
	MessageFilterOperation,
	MessageFilterType,
} from "./messageDistribution";
import { FileSuggest } from "./suggesters/FileSuggester";
import { _15sec, displayAndLog } from "src/utils/logUtils";

export class MessageDistributionRulesModal extends Modal {
	messageDistributionRule: MessageDistributionRule;
	messageDistributionRulesDiv: HTMLDivElement;
	saved = false;
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}
	async display(existingRule?: MessageDistributionRule) {
		this.contentEl.empty();
		this.messageDistributionRulesDiv = this.contentEl.createDiv();
		this.messageDistributionRulesDiv.createEl("h4", { text: "Message Distribution Rules settings" });
		if (existingRule) {
			this.messageDistributionRule = existingRule;
		} else {
			this.messageDistributionRule = {
				messageFilterQuery: "",
				messageFilters: [
					{
						filterType: MessageFilterType.ALL,
						operation: MessageFilterOperation.NO_OPERATION,
						value: "",
					},
				],
				path2Template: "",
				path2Note: "",
				path2Files: "",
			};
		}
		this.addMessageFilter();
		this.addTemplateFile();
		this.addNewNotesPath();
		this.addNewFilesPath();
		this.addVariablesList();
		this.addFooterButtons();
	}

	addMessageFilter() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Message filter")
			.setDesc(
				"Conditions by which you would like to filter messages\n" +
					"Leave the field blank if you want to apply this rule to all messages",
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

	addTemplateFile() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Template file")
			.setDesc("Specify path to template file you want to apply to new notes")
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin);
				cb.setPlaceholder("example:  folder/zettelkasten.md")
					.setValue(this.messageDistributionRule.path2Template)
					.onChange(async (templateFile) => {
						this.messageDistributionRule.path2Template = templateFile
							? normalizePath(templateFile)
							: templateFile;
						await this.plugin.saveSettings();
					});
			});
	}

	addNewNotesPath() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("New notes path")
			.setDesc(
				"Folder where the new notes will be created\n" +
					"Leave empty if you don't want to create any notes from messages",
			)
			.addTextArea((text) => {
				text.setPlaceholder(`example: folder/${defaultNoteNameTemplate}`)
					.setValue(this.messageDistributionRule.path2Note)
					.onChange(async (value: string) => {
						this.messageDistributionRule.path2Note = value;
					});
			});
	}

	addNewFilesPath() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("New files path")
			.setDesc("Folder where the new files will be saved.\nLeave empty if you don't want to save any files")
			.addTextArea((text) => {
				text.setPlaceholder(`example: folder/${defaultFileNameTemplate}`)
					.setValue(this.messageDistributionRule.path2Files)
					.onChange(async (value: string) => {
						this.messageDistributionRule.path2Files = value;
					});
			});
	}

	addVariablesList() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Variables list")
			.setDesc("List of variables that are available to use in templates and storage paths.")
			// ro rename everywhere where "El" not for html element
			.addButton((buttonEl) => {
				buttonEl.setButtonText("Open in browser"); // Set the button text
				buttonEl.onClick(() => {
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
						// ro add check only one should be filled
						// displayAndLog(plugin, "", _15sec);
						this.messageDistributionRule.path2Template &&
						this.messageDistributionRule.path2Note &&
						this.messageDistributionRule.path2Files
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
