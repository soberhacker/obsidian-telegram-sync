import TelegramSyncPlugin from "src/main";
import { PluginSettingTab, Setting, normalizePath } from "obsidian";
import { FileSuggest } from "./suggesters/FileSuggester";
import { FolderSuggest } from "./suggesters/FolderSuggester";
import { displayAndLog } from "src/utils/logUtils";
import { cryptoDonationButton, paypalButton, buyMeACoffeeButton, kofiButton } from "./donation";

export interface TelegramSyncSettings {
	botToken: string;
	newNotesLocation: string;
	appendAllToTelegramMd: boolean;
	templateFileLocation: string;
	deleteMessagesFromTelegram: boolean;
	newFilesLocation: string;
	allowedChatFromUsernames: string[];
	mainDeviceId: string;
	pluginVersion: string;
}

export const DEFAULT_SETTINGS: TelegramSyncSettings = {
	botToken: "",
	newNotesLocation: "",
	appendAllToTelegramMd: false,
	templateFileLocation: "",
	deleteMessagesFromTelegram: false,
	newFilesLocation: "",
	allowedChatFromUsernames: [""],
	mainDeviceId: "",
	pluginVersion: "",
};

export class TelegramSyncSettingTab extends PluginSettingTab {
	constructor(private plugin: TelegramSyncPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h1", { text: "Telegram Sync" });
		containerEl.createEl("p", { text: "Created by " }).createEl("a", {
			text: "soberHacker🍃🧘💻",
			href: "https://github.com/soberhacker",
		});

		const botFatherSetting = new Setting(containerEl)
			.setName("Bot token (required)")
			.setDesc("Enter your Telegram bot token.")
			.addText((text) =>
				text
					.setPlaceholder("example: 6123456784:AAX9mXnFE2q9WahQ")
					.setValue(this.plugin.settings.botToken)
					.onChange(async (value: string) => {
						this.plugin.settings.botToken = value;
						await this.plugin.saveSettings();
						this.plugin.initTelegramBot(); // Initialize the bot with the new token
					})
			);

		// add link to botFather
		const botFatherLink = document.createElement("div");
		botFatherLink.textContent = "To create a new bot click on -> ";
		botFatherLink.createEl("a", {
			href: "https://t.me/botfather",
			text: "@botFather",
		});
		botFatherSetting.descEl.appendChild(botFatherLink);

		const allowedChatFromUsernamesSetting = new Setting(containerEl)
			.setName("Allowed chat from usernames (required)")
			.setDesc("Only messages from these usernames will be processed. At least your username must be entered.")
			.addTextArea((text) => {
				const textArea = text
					.setPlaceholder("example: soberHacker,soberHackerBot")
					.setValue(this.plugin.settings.allowedChatFromUsernames.join(","))
					.onChange(async (value: string) => {
						if (!value.trim()) {
							textArea.inputEl.style.borderColor = "red";
							textArea.inputEl.style.borderWidth = "2px";
							textArea.inputEl.style.borderStyle = "solid";
							return;
						}
						this.plugin.settings.allowedChatFromUsernames = value.split(",");
						await this.plugin.saveSettings();
					});
			});

		// add link to Telegram FAQ about getting username
		const howDoIGetUsername = document.createElement("div");
		howDoIGetUsername.textContent = "To get help click on -> ";
		howDoIGetUsername.createEl("a", {
			href: "https://telegram.org/faq?setln=en#q-what-are-usernames-how-do-i-get-one",
			text: "Telegram FAQ",
		});
		allowedChatFromUsernamesSetting.descEl.appendChild(howDoIGetUsername);

		new Setting(containerEl)
			.setName("New notes location")
			.setDesc("Folder where the new notes will be created")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("example: folder1/folder2")
					.setValue(this.plugin.settings.newNotesLocation)
					.onChange((newFolder) => {
						this.plugin.settings.newNotesLocation = normalizePath(newFolder);
						this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("New files location")
			.setDesc("Folder where the new files will be created")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("example: folder1/folder2")
					.setValue(this.plugin.settings.newFilesLocation)
					.onChange((newFolder) => {
						this.plugin.settings.newFilesLocation = normalizePath(newFolder);
						this.plugin.saveSettings();
					});
			});

		const templateFileLocationSetting = new Setting(containerEl)
			.setName("Template file location")
			.setDesc("Template to use when creating new notes")
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin);
				cb.setPlaceholder("example: folder/zettelkasten.md")
					.setValue(this.plugin.settings.templateFileLocation)
					.onChange((templateFile) => {
						this.plugin.settings.templateFileLocation = normalizePath(templateFile);
						this.plugin.saveSettings();
					});
			});

		// add template available variables
		const availableTemplateVariables = document.createElement("div");
		availableTemplateVariables.textContent =
			"Available variables: {{content}}, {{forwardFrom}}, {{messageDate:YYYYMMDD}}, {{messageTime:HHmmss}}";
		templateFileLocationSetting.descEl.appendChild(availableTemplateVariables);

		const deviceIdSetting = new Setting(containerEl)
			.setName("Main device id")
			.setDesc(
				"Specify the device to be used for sync when running Obsidian simultaneously on multiple desktops. If not specified, the priority will shift unpredictably."
			)
			.addText((text) =>
				text
					.setPlaceholder("example: 98912984-c4e9-5ceb-8000-03882a0485e4")
					.setValue(this.plugin.settings.mainDeviceId)
					.onChange(async (value) => await this.setMainDeviceIdSetting(value))
			);

		// current device id copy to settings
		const deviceIdLink = document.createElement("div");
		deviceIdLink.textContent = "To make the current device as main, click on -> ";
		deviceIdLink
			.createEl("a", {
				href: this.plugin.currentDeviceId,
				text: this.plugin.currentDeviceId,
			})
			.onClickEvent((evt) => {
				evt.preventDefault();
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				let inputDeviceId: any;
				try {
					inputDeviceId = deviceIdSetting.controlEl.firstElementChild;
					inputDeviceId.value = this.plugin.currentDeviceId;
				} catch (error) {
					displayAndLog(`Try to copy and paste device id manually. Error: ${error}`);
				}
				if (inputDeviceId && inputDeviceId.value) {
					this.setMainDeviceIdSetting(this.plugin.currentDeviceId);
				}
			});
		deviceIdSetting.descEl.appendChild(deviceIdLink);

		new Setting(containerEl)
			.setName("Append all to Telegram.md")
			.setDesc(
				"All messages will be appended into a single file, Telegram.md. If disabled, a separate file will be created for each message"
			)
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.appendAllToTelegramMd).onChange(async (value: boolean) => {
					this.plugin.settings.appendAllToTelegramMd = value;
					await this.plugin.saveSettings();
				})
			);

		new Setting(containerEl)
			.setName("Delete messages from Telegram")
			.setDesc(
				"The Telegram messages will be deleted after processing them. If disabled, the Telegram messages will be marked as processed"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.deleteMessagesFromTelegram);
				toggle.onChange(async (value) => {
					this.plugin.settings.deleteMessagesFromTelegram = value;
					await this.plugin.saveSettings();
				});
			});

		containerEl.createEl("hr");

		const donationDiv = containerEl.createEl("div", {
			cls: "telegramSyncSettingsDonationSection",
		});

		const donationText = createEl("p");
		donationText.appendText(
			"If you like this Plugin and are considering donating to support continued development, use the buttons below!"
		);

		donationDiv.appendChild(donationText);
		donationDiv.appendChild(cryptoDonationButton);
		donationDiv.appendChild(paypalButton);
		donationDiv.appendChild(buyMeACoffeeButton);
		donationDiv.appendChild(kofiButton);
	}

	async setMainDeviceIdSetting(value: string) {
		this.plugin.settings.mainDeviceId = value;
		await this.plugin.saveSettings();
		this.plugin.initTelegramBot();
	}
}
