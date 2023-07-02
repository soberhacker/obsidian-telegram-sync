import TelegramSyncPlugin from "src/main";
import { ButtonComponent, PluginSettingTab, Setting, TextComponent, normalizePath } from "obsidian";
import { FileSuggest } from "./suggesters/FileSuggester";
import { FolderSuggest } from "./suggesters/FolderSuggester";
import { cryptoDonationButton, paypalButton, buyMeACoffeeButton, kofiButton } from "./donation";
import TelegramBot from "node-telegram-bot-api";
import { createProgressBar, updateProgressBar, deleteProgressBar } from "src/telegram/progressBar";
import * as GramJs from "src/telegram/GramJs/client";
import { BotSettingsModal } from "./BotSettingsModal";
import { UserLogInModal } from "./UserLogInModal";
import { version } from "release-notes.mjs";

export interface TopicName {
	name: string;
	chatId: number;
	topicId: number;
}

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
	topicNames: TopicName[];
	telegramSessionType: GramJs.SessionType;
	telegramSessionId: number;
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
	topicNames: [],
	telegramSessionType: "bot",
	telegramSessionId: GramJs.getNewSessionId(),
};

export class TelegramSyncSettingTab extends PluginSettingTab {
	constructor(private plugin: TelegramSyncPlugin) {
		super(app, plugin);
	}

	display(): void {
		this.containerEl.empty();
		this.addSettingsHeader();

		this.addBot();
		this.addUser();
		this.containerEl.createEl("br");
		this.containerEl.createEl("h2", { text: "Locations" });
		this.addNewNotesLocation();
		this.addNewFilesLocation();
		this.addTemplateFileLocation();
		this.containerEl.createEl("br");
		this.containerEl.createEl("h2", { text: "Behavior settings" });
		this.addAppendAllToTelegramMd();
		this.addDeleteMessagesFromTelegram();
		this.addDonation();
	}

	addSettingsHeader() {
		this.containerEl.createEl("h1", { text: `Telegram Sync ${version}` });
		this.containerEl.createEl("p", { text: "Created by " }).createEl("a", {
			text: "soberhacker🍃🧘💻",
			href: "https://github.com/soberhacker",
		});
		this.containerEl.createEl("br");
	}

	addBot() {
		let botStatusComponent: TextComponent;

		const botStatusConstructor = async (botStatus: TextComponent) => {
			botStatusComponent = botStatusComponent || botStatus;
			botStatus.setDisabled(true);
			if (this.plugin.checkingBotConnection) {
				botStatus.setValue("⏳ connecting...");
				new Promise((resolve) => {
					setTimeout(() => resolve(botStatusConstructor.call(this, botStatus)), 5 * 1000);
				});
			} else if (this.plugin.settings.botToken && this.plugin.botConnected) botStatus.setValue("🤖 connected");
			else botStatus.setValue("❌ disconnected");
		};

		const botSettingsConstructor = (botSettingsButton: ButtonComponent) => {
			if ((this.plugin.settings.botToken && this.plugin.botConnected) || this.plugin.checkingBotConnection)
				botSettingsButton.setButtonText("Settings");
			else botSettingsButton.setButtonText("Connect");
			botSettingsButton.onClick(async () => {
				const botSettingsModal = new BotSettingsModal(this.plugin);
				botSettingsModal.onClose = async () => {
					if (botSettingsModal.saved) {
						// Initialize the bot with the new token
						this.plugin.checkingBotConnection = true;
						try {
							botStatusConstructor.call(this, botStatusComponent);
							botSettingsConstructor.call(this, botSettingsButton);
							if (this.plugin.settings.telegramSessionType == "bot")
								await this.plugin.initTelegramClient(this.plugin.settings.telegramSessionType);
							await this.plugin.initTelegramBot();
						} finally {
							this.plugin.checkingBotConnection = false;
						}
					}
				};
				botSettingsModal.open();
			});
			if (this.plugin.checkingBotConnection) {
				botSettingsButton.setDisabled(true);
				new Promise((resolve) => {
					setTimeout(() => resolve(botSettingsConstructor.call(this, botSettingsButton)), 5 * 1000);
				});
			} else botSettingsButton.setDisabled(false);
		};
		const botSettings = new Setting(this.containerEl)
			.setName("Bot (required)")
			.setDesc("Connect your telegram bot. It's required for all features.")
			.addText(botStatusConstructor)
			.addButton(botSettingsConstructor);
		// add link to botFather
		const botFatherLink = document.createElement("div");
		botFatherLink.textContent = "To create a new bot click on -> ";
		botFatherLink.createEl("a", {
			href: "https://t.me/botfather",
			text: "@botFather",
		});
		botSettings.descEl.appendChild(botFatherLink);
	}

	addUser() {
		let userStatusComponent: TextComponent;

		const userStatusConstructor = (userStatus: TextComponent) => {
			userStatusComponent = userStatusComponent || userStatus;
			userStatus.setDisabled(true);
			if (this.plugin.userConnected) userStatus.setValue("👨🏽‍💻 connected");
			else userStatus.setValue("❌ disconnected");
		};

		const userLogInConstructor = (userLogInButton: ButtonComponent) => {
			if (this.plugin.settings.telegramSessionType == "user") userLogInButton.setButtonText("Log out");
			else userLogInButton.setButtonText("Log in");

			userLogInButton.onClick(async () => {
				if (this.plugin.settings.telegramSessionType == "user") {
					// Log Out
					await this.plugin.initTelegramClient("bot");
					userStatusConstructor.call(this, userStatusComponent);
					userLogInConstructor.call(this, userLogInButton);
				} else {
					// Log In
					const userLogInModal = new UserLogInModal(this.plugin);
					userLogInModal.onClose = async () => {
						userStatusConstructor.call(this, userStatusComponent);
						userLogInConstructor.call(this, userLogInButton);
					};
					userLogInModal.open();
				}
			});
		};

		const userSettings = new Setting(this.containerEl)
			.setName("User (optionally)")
			.setDesc("Connect your telegram user. It's required only for ")
			.addText(userStatusConstructor)
			.addButton(userLogInConstructor);

		if (this.plugin.settings.telegramSessionType == "user" && !this.plugin.userConnected) {
			userSettings.addExtraButton((refreshButton) => {
				refreshButton.setTooltip("Refresh");
				refreshButton.setIcon("refresh-ccw");
				refreshButton.onClick(async () => {
					await this.plugin.initTelegramClient("user", this.plugin.settings.telegramSessionId);
					userStatusConstructor.call(this, userStatusComponent);
					refreshButton.setDisabled(true);
				});
			});
		}

		// add link to authorized user features
		userSettings.descEl.createEl("a", {
			href: "https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Authorized%20User%20Features.md",
			text: "a few secondary features",
		});
	}

	addNewNotesLocation() {
		new Setting(this.containerEl)
			.setName("New notes location")
			.setDesc("Folder where the new notes will be created")
			.addSearch((cb) => {
				new FolderSuggest(cb.inputEl);
				cb.setPlaceholder("example: folder1/folder2")
					.setValue(this.plugin.settings.newNotesLocation)
					.onChange(async (newFolder) => {
						this.plugin.settings.newNotesLocation = newFolder ? normalizePath(newFolder) : newFolder;
						await this.plugin.saveSettings();
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
					.onChange(async (newFolder) => {
						this.plugin.settings.newFilesLocation = newFolder ? normalizePath(newFolder) : newFolder;
						await this.plugin.saveSettings();
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
					.onChange(async (templateFile) => {
						this.plugin.settings.templateFileLocation = templateFile
							? normalizePath(templateFile)
							: templateFile;
						await this.plugin.saveSettings();
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

	async storeTopicName(msg: TelegramBot.Message) {
		const bot = this.plugin.bot;
		if (!bot || !msg.text) return;

		const reply = msg.reply_to_message;
		if (msg.message_thread_id || (reply && reply.message_thread_id)) {
			const topicName = msg.text.substring(11);
			if (!topicName) throw new Error("Set topic name! example: /topicName NewTopicName");
			const newTopicName: TopicName = {
				name: topicName,
				chatId: msg.chat.id,
				topicId: msg.message_thread_id || reply?.message_thread_id || 1,
			};
			const topicNameIndex = this.plugin.settings.topicNames.findIndex(
				(tn) => tn.topicId == newTopicName.topicId && tn.chatId == newTopicName.chatId
			);
			if (topicNameIndex > -1) {
				this.plugin.settings.topicNames[topicNameIndex].name = newTopicName.name;
			} else this.plugin.settings.topicNames.push(newTopicName);
			await this.plugin.saveSettings();

			const progressBarMessage = await createProgressBar(bot, msg, "stored");

			// Update the progress bar during the delay
			let stage = 0;
			for (let i = 1; i <= 10; i++) {
				await new Promise((resolve) => setTimeout(resolve, 50)); // 50 ms delay between updates
				stage = await updateProgressBar(bot, msg, progressBarMessage, 10, i, stage);
			}
			await bot.deleteMessage(msg.chat.id, msg.message_id);
			await deleteProgressBar(bot, msg, progressBarMessage);
		} else {
			throw new Error("You can set the topic name only by sending the command to the topic!");
		}
	}
}
