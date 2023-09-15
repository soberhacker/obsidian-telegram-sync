import { Modal, normalizePath, Setting } from "obsidian";
import TelegramSyncPlugin from "../main";
import {
	defaultFileNameTemplate,
	defaultNoteNameTemplate,
	extractMessageFiltersFromQuery,
	createBlankMessageDistributionRule,
	MessageDistributionRule,
} from "./messageDistribution";
import { FileSuggest } from "./suggesters/FileSuggester";
import { _15sec, displayAndLog } from "../utils/logUtils";

export class MessageDistributionRulesModal extends Modal {
	messageDistributionRule: MessageDistributionRule;
	messageDistributionRulesDiv: HTMLDivElement;
	plugin: TelegramSyncPlugin;
	saved = false;
	editing = false;

	constructor(plugin: TelegramSyncPlugin, messageDistributionRule?: MessageDistributionRule) {
		super(plugin.app);
		this.plugin = plugin;
		if (messageDistributionRule) {
			this.editing = true;
			this.messageDistributionRule = messageDistributionRule;
		} else this.messageDistributionRule = createBlankMessageDistributionRule();
	}

	async display() {
		this.contentEl.empty();
		this.messageDistributionRulesDiv = this.contentEl.createDiv();
		this.messageDistributionRulesDiv.createEl("h4", {
			text: `${this.editing ? "Editing" : "Adding"} message distribution rule`,
		});
		this.addMessageFilter();
		this.addTemplateFilePath();
		this.addNotePathTemplate();
		this.addFilePathTemplate();
		this.addVariablesList();
		this.addFooterButtons();
	}
	addMessageFilter() {
		const setting = new Setting(this.messageDistributionRulesDiv)
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
		setSettingStyles(setting);
	}

	addTemplateFilePath() {
		const setting = new Setting(this.messageDistributionRulesDiv)
			.setName("Template file path")
			.setDesc("Specify path to template file you want to apply to new notes")
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin);
				cb.setPlaceholder("example: folder/zettelkasten.md")
					.setValue(this.messageDistributionRule.templateFilePath)
					.onChange(async (path) => {
						this.messageDistributionRule.templateFilePath = path ? normalizePath(path) : path;
					});
			});
		setting.infoEl.style.width = "65%";
		setting.controlEl.style.width = "35%";
	}

	addNotePathTemplate() {
		const setting = new Setting(this.messageDistributionRulesDiv)
			.setName("Note path template")
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
		setSettingStyles(setting);
	}

	addFilePathTemplate() {
		const setting = new Setting(this.messageDistributionRulesDiv);
		setting
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
		setSettingStyles(setting);
	}

	addVariablesList() {
		new Setting(this.messageDistributionRulesDiv)
			.setName("Variables list")
			.setDesc("List of variables that are available to use in filters, templates and storage paths")
			.addButton((btn) => {
				btn.setButtonText("Open in browser");
				btn.onClick(() => {
					// TODO next: revert link after beta testing to "https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md",
					window.open(
						"https://github.com/soberhacker/obsidian-telegram-sync/blob/path-templates/docs/Template%20Variables%20List.md",
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
						!this.messageDistributionRule.templateFilePath &&
						!this.messageDistributionRule.notePathTemplate &&
						!this.messageDistributionRule.filePathTemplate
					) {
						displayAndLog(this.plugin, "Please, fill at least one field", _15sec);
						return;
					}
					if (!this.editing) this.plugin.settings.messageDistributionRules.push(this.messageDistributionRule);
					await this.plugin.saveSettings();
					this.saved = true;
					this.close();
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
		this.display();
	}
}
function setSettingStyles(setting: Setting) {
	setting.infoEl.style.width = "65%";
	setting.controlEl.style.width = "35%";
	const textareaElement = setting.controlEl.querySelector("textarea");
	if (textareaElement) {
		textareaElement.style.height = "4.5em";
		textareaElement.style.width = "100%";
	}
}
