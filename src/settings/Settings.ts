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
	appId: string;
	apiHash: string;
	//telegramPassword: string;
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
	appId: "17349", // public, ok to be here
	apiHash: "344583e45741c457fe1862106095a5eb", // public, ok to be here
	//telegramPassword: "",
};

export class TelegramSyncSettingTab extends PluginSettingTab {
	constructor(private plugin: TelegramSyncPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.addSettingsHeader();
		this.addBotToken();
		this.addAllowedChatFromUsernamesSetting();
		this.addDeviceId();
		this.containerEl.createEl("h2", { text: "Locations" });
		this.addNewNotesLocation();
		this.addNewFilesLocation();
		this.addTemplateFileLocation();
		this.containerEl.createEl("h2", { text: "Behavior settings" });
		this.addAppendAllToTelegramMd();
		this.addDeleteMessagesFromTelegram();
		// Uncomment only if error API_ID_PUBLISHED_FLOOD
		//this.containerEl.createEl("h2", { text: "Client Authorization" });
		//this.addClientAuthorizationDescription();
		//this.addApiId();
		//this.addAppHash();
		this.addDonation();
	}

	addSettingsHeader() {
		this.containerEl.createEl("h1", { text: "Telegram Sync" });
		this.containerEl.createEl("p", { text: "Created by " }).createEl("a", {
			text: "soberHacker🍃🧘💻",
			href: "https://github.com/soberhacker",
		});
	}

	addBotToken() {
		const botFatherSetting = new Setting(this.containerEl)
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
	}

	addAllowedChatFromUsernamesSetting() {
		const allowedChatFromUsernamesSetting = new Setting(this.containerEl)
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
	}

	addDeviceId() {
		const deviceIdSetting = new Setting(this.containerEl)
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
	}

	addNewNotesLocation() {
		new Setting(this.containerEl)
			.setName("New notes location")
			.setDesc("Folder where the new notes will be created")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("example: folder1/folder2")
					.setValue(this.plugin.settings.newNotesLocation)
					.onChange((newFolder) => {
						this.plugin.settings.newNotesLocation = newFolder ? normalizePath(newFolder) : newFolder;
						this.plugin.saveSettings();
					});
			});
	}

	addNewFilesLocation() {
		new Setting(this.containerEl)
			.setName("New files location")
			.setDesc("Folder where the new files will be created")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("example: folder1/folder2")
					.setValue(this.plugin.settings.newFilesLocation)
					.onChange((newFolder) => {
						this.plugin.settings.newFilesLocation = newFolder ? normalizePath(newFolder) : newFolder;
						this.plugin.saveSettings();
					});
			});
	}

	addTemplateFileLocation() {
		const templateFileLocationSetting = new Setting(this.containerEl)
			.setName("Template file location")
			.setDesc("Template to use when creating new notes.")
			.addSearch((cb) => {
				new FileSuggest(cb.inputEl, this.plugin);
				cb.setPlaceholder("example: folder/zettelkasten.md")
					.setValue(this.plugin.settings.templateFileLocation)
					.onChange((templateFile) => {
						this.plugin.settings.templateFileLocation = templateFile
							? normalizePath(templateFile)
							: templateFile;
						this.plugin.saveSettings();
					});
			});
		// add template available variables
		const availableTemplateVariables = document.createElement("div");
		availableTemplateVariables.textContent = "To get list of available variables click on -> ";
		availableTemplateVariables.createEl("a", {
			href: "https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md",
			text: "Template Variables List",
		});
		templateFileLocationSetting.descEl.appendChild(availableTemplateVariables);
	}

	addAppendAllToTelegramMd() {
		new Setting(this.containerEl)
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
	}

	addDeleteMessagesFromTelegram() {
		new Setting(this.containerEl)
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
	}

	// addClientAuthorizationDescription() {
	// 	const clientAuthorizationDescription = new Setting(this.containerEl).setDesc(
	// 		"Entering api_id and api_hash is required for downloading files over 20MB."
	// 	);
	// 	clientAuthorizationDescription.descEl.createDiv({ text: "To get manual click on -> " }).createEl("a", {
	// 		href: "https://core.telegram.org/api/obtaining_api_id",
	// 		text: "Obtaining api_id",
	// 	});
	// }

	// addApiId() {
	// 	new Setting(this.containerEl)
	// 		.setName("api_id")
	// 		.setDesc("Enter Telegram Client api_id")
	// 		.addText((text) =>
	// 			text
	// 				.setPlaceholder("example: 61234")
	// 				.setValue(this.plugin.settings.appId)
	// 				.onChange(async (value: string) => {
	// 					this.plugin.settings.appId = value;
	// 					await this.plugin.saveSettings();
	// 					this.plugin.initTelegramClient();
	// 				})
	// 		);
	// }

	// addAppHash() {
	// 	new Setting(this.containerEl)
	// 		.setName("api_hash")
	// 		.setDesc("Enter Telegram Client api_hash")
	// 		.addText((text) =>
	// 			text
	// 				.setPlaceholder("example: asdda623sdk4")
	// 				.setValue(this.plugin.settings.apiHash)
	// 				.onChange(async (value: string) => {
	// 					this.plugin.settings.apiHash = value;
	// 					await this.plugin.saveSettings();
	// 					this.plugin.initTelegramClient();
	// 				})
	// 		);
	// }

	// new Setting(secretSettingsDiv)
	// 	.setName("Telegram Password")
	// 	.setDesc(
	// 		"Enter your password from Telegram. Will not be stored and will be removed after succeeding log in."
	// 	)
	// 	.addText((text) =>
	// 		text
	// 			.setPlaceholder("*********")
	// 			.setValue(this.plugin.settings.telegramPassword)
	// 			.onChange(async (value: string) => {
	// 				this.plugin.settings.telegramPassword = value;
	// 			})
	// 	);

	// new Setting(secretSettingsDiv)
	// 	.setName("Log In By Qr Code")
	// 	.setDesc("Scan this Qr Code by official Telegram app on your smartphone. You have 30 sec to do this.")
	// 	.addButton((button) => {
	// 		button.setButtonText("GENERATE QR CODE");
	// 		button.setDisabled(this.plugin.settings.appId == "" || this.plugin.settings.apiHash == "");
	// 		button.onClick(async () => {
	// 			const qrCodeContainer: HTMLDivElement = secretSettingsDiv.createDiv({ cls: "qr-code-container" });
	// 			await gram.initUser(
	// 				+this.plugin.settings.appId,
	// 				this.plugin.settings.apiHash,
	// 				this.plugin.botName,
	// 				this.plugin.settings.telegramPassword,
	// 				qrCodeContainer
	// 			);
	// 		});
	// 	});

	addDonation() {
		this.containerEl.createEl("hr");

		const donationDiv = this.containerEl.createEl("div");
		donationDiv.addClass("telegramSyncSettingsDonationSection");

		const donationText = createEl("p");
		donationText.appendText(
			"If you like this Plugin and are considering donating to support continued development, use the buttons below!"
		);
		donationDiv.appendChild(donationText);

		cryptoDonationButton.style.marginRight = "20px";
		donationDiv.appendChild(cryptoDonationButton);
		buyMeACoffeeButton.style.marginRight = "20px";
		donationDiv.appendChild(buyMeACoffeeButton);
		donationDiv.appendChild(createEl("p"));
		kofiButton.style.marginRight = "20px";
		donationDiv.appendChild(kofiButton);
		donationDiv.appendChild(paypalButton);
	}

	async setMainDeviceIdSetting(value: string) {
		this.plugin.settings.mainDeviceId = value;
		await this.plugin.saveSettings();
		this.plugin.initTelegramBot();
	}
}
