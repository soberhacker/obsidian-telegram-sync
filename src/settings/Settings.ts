import TelegramSyncPlugin from "src/main";
import { App, ButtonComponent, Notice, PluginSettingTab, Setting, TextComponent } from "obsidian";
import { boostyButton, paypalButton, buyMeACoffeeButton, kofiButton } from "./donation";
import TelegramBot from "node-telegram-bot-api";
import { createProgressBar, updateProgressBar, deleteProgressBar, ProgressBarType } from "src/telegram/bot/progressBar";
import * as Client from "src/telegram/user/client";
import { BotSettingsModal } from "./BotSettingsModal";
import { UserLogInModal } from "./UserLogInModal";
import { version, versionALessThanVersionB } from "release-notes.mjs";
import { _15sec, _1sec, _5sec, displayAndLog, doNotHide } from "src/utils/logUtils";
import { getTopicId } from "src/telegram/bot/message/getters";
import * as User from "../telegram/user/user";
import { replaceMainJs } from "src/utils/fsUtils";
import {
	ConnectionStatusIndicatorType,
	KeysOfConnectionStatusIndicatorType,
	connectionStatusIndicatorSettingName,
} from "src/ConnectionStatusIndicator";
import { enqueue } from "src/utils/queues";
import { MessageDistributionRule, createDefaultMessageDistributionRule } from "./messageDistribution";
import { MessageDistributionRulesModal } from "./MessageDistributionRulesModal";
import { arrayMove } from "src/utils/arrayUtils";

export interface Topic {
	name: string;
	chatId: number;
	topicId: number;
}

export interface TelegramSyncSettings {
	botToken: string;
	newNotesLocation: string; //TODO in 2024: deprecated, use messageDistributionRules[].path2Note
	appendAllToTelegramMd: boolean; //TODO in 2024: deprecated, use messageDistributionRules[].path2Note
	templateFileLocation: string; //TODO in 2024: deprecated, use messageDistributionRules[].path2Template
	deleteMessagesFromTelegram: boolean;
	needToSaveFiles: boolean; //TODO in 2024: deprecated, now if messageDistributionRules[].path2Files is empty then files will not be stored
	newFilesLocation: string; //TODO in 2024: deprecated, use messageDistributionRules[].path2Files
	allowedChatFromUsernames: string[]; //TODO in 2024: deprecated, use allowedChats
	allowedChats: string[];
	mainDeviceId: string;
	pluginVersion: string;
	telegramSessionType: Client.SessionType;
	telegramSessionId: number;
	betaVersion: string;
	connectionStatusIndicatorType: KeysOfConnectionStatusIndicatorType;
	cacheCleanupAtStartup: boolean;
	messageDistributionRules: MessageDistributionRule[];
	// add new settings above this line
	topicNames: Topic[];
}

export const DEFAULT_SETTINGS: TelegramSyncSettings = {
	botToken: "",
	newNotesLocation: "",
	appendAllToTelegramMd: false,
	templateFileLocation: "",
	deleteMessagesFromTelegram: false,
	needToSaveFiles: true,
	newFilesLocation: "",
	allowedChatFromUsernames: [""], //TODO in 2024: deprecated, use allowedChats
	allowedChats: [""],
	mainDeviceId: "",
	pluginVersion: "",
	telegramSessionType: "bot",
	telegramSessionId: Client.getNewSessionId(),
	betaVersion: "",
	connectionStatusIndicatorType: "CONSTANT",
	cacheCleanupAtStartup: false,
	messageDistributionRules: [createDefaultMessageDistributionRule()],
	// add new settings above this line
	topicNames: [],
};
export class TelegramSyncSettingTab extends PluginSettingTab {
	plugin: TelegramSyncPlugin;
	botStatusTimeOut: NodeJS.Timeout;
	botSettingsTimeOut: NodeJS.Timeout;

	constructor(app: App, plugin: TelegramSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		this.containerEl.empty();
		this.addSettingsHeader();

		this.addBot();
		this.addUser();

		this.containerEl.createEl("br");
		this.containerEl.createEl("h2", { text: "Behavior settings" });
		this.addDeleteMessagesFromTelegram();
		this.addMessageDistributionRules();

		this.containerEl.createEl("br");
		this.containerEl.createEl("h2", { text: "System settings" });
		await this.addBetaRelease();
		this.addConnectionStatusIndicator();

		this.addDonation();
	}

	hide() {
		super.hide();
		clearTimeout(this.botStatusTimeOut);
		clearTimeout(this.botSettingsTimeOut);
	}

	addSettingsHeader() {
		this.containerEl.createEl("h1", {
			text: `Telegram Sync ${
				versionALessThanVersionB(this.plugin.manifest.version, this.plugin.settings.betaVersion)
					? this.plugin.settings.betaVersion
					: version
			}`,
		});
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
			} else if (this.plugin.settings.botToken && this.plugin.isBotConnected())
				botStatus.setValue("🤖 connected");
			else botStatus.setValue("❌ disconnected");
			new Promise((resolve) => {
				clearTimeout(this.botStatusTimeOut);
				this.botStatusTimeOut = setTimeout(() => resolve(botStatusConstructor.call(this, botStatus)), _1sec);
			});
		};

		const botSettingsConstructor = (botSettingsButton: ButtonComponent) => {
			if (this.plugin.checkingBotConnection) botSettingsButton.setButtonText("Restart");
			else if (this.plugin.settings.botToken && this.plugin.isBotConnected())
				botSettingsButton.setButtonText("Settings");
			else botSettingsButton.setButtonText("Connect");
			botSettingsButton.onClick(async () => {
				const botSettingsModal = new BotSettingsModal(this.plugin);
				botSettingsModal.onClose = async () => {
					if (botSettingsModal.saved) {
						if (this.plugin.settings.telegramSessionType == "bot") {
							this.plugin.settings.telegramSessionId = Client.getNewSessionId();
							this.plugin.userConnected = false;
						}
						await this.plugin.saveSettings();
						// Initialize the bot with the new token
						this.plugin.setBotStatus("disconnected");
						botStatusConstructor.call(this, botStatusComponent);
						botSettingsConstructor.call(this, botSettingsButton);
						await enqueue(this.plugin, this.plugin.initTelegram);
					}
				};
				botSettingsModal.open();
			});

			new Promise((resolve) => {
				clearTimeout(this.botSettingsTimeOut);
				this.botSettingsTimeOut = setTimeout(
					() => resolve(botSettingsConstructor.call(this, botSettingsButton)),
					_5sec,
				);
			});
		};
		const botSettings = new Setting(this.containerEl)
			.setName("Bot (required)")
			.setDesc("Connect your telegram bot. It's required for all features.")
			.addText(botStatusConstructor.bind(this))
			.addButton(botSettingsConstructor.bind(this));
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
		// TODO add refreshing connecting state as for bot
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
					await User.connect(this.plugin, "bot");
					displayAndLog(
						this.plugin,
						"Successfully logged out.\n\nBut you should also terminate the session manually in the Telegram app.",
						_15sec,
					);
					userStatusConstructor.call(this, userStatusComponent);
					userLogInConstructor.call(this, userLogInButton);
				} else {
					// Log In
					const initialSessionType = this.plugin.settings.telegramSessionType;
					const userLogInModal = new UserLogInModal(this.plugin);
					userLogInModal.onClose = async () => {
						if (initialSessionType == "bot" && !this.plugin.userConnected) {
							this.plugin.settings.telegramSessionType = initialSessionType;
							this.plugin.saveSettings();
						}
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
			.addText(userStatusConstructor.bind(this))
			.addButton(userLogInConstructor.bind(this));
		// TODO removing Refresh button if this.plugin.settings.telegramSessionType changed to "bot" (when Log out, etc)
		if (this.plugin.settings.telegramSessionType == "user" && !this.plugin.userConnected) {
			userSettings.addExtraButton((refreshButton) => {
				refreshButton.setTooltip("Refresh");
				refreshButton.setIcon("refresh-ccw");
				refreshButton.onClick(async () => {
					await User.connect(this.plugin, "user", this.plugin.settings.telegramSessionId);
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
	addMessageDistributionRules() {
		const messageDistributionSetting = new Setting(this.containerEl);
		messageDistributionSetting
			.setName("Message distribution rules")
			.setDesc("Configure message filters, content template, and storage paths for new notes and files")
			.addButton((btn: ButtonComponent) => {
				btn.setButtonText("+");
				btn.setClass("mod-cta");
				btn.onClick(async () => {
					const messageDistributionRulesModal = new MessageDistributionRulesModal(this.plugin);
					messageDistributionRulesModal.onClose = async () => {
						if (messageDistributionRulesModal.saved) await this.display();
					};
					messageDistributionRulesModal.open();
				});
			});
		this.plugin.settings.messageDistributionRules.forEach((rule, index) => {
			const setting = new Setting(this.containerEl);
			setting.infoEl.replaceWith(rule.messageFilterQuery);
			setting.settingEl.classList.add("my-custom-list-item");
			setting.addExtraButton((btn) => {
				btn.setIcon("up-chevron-glyph")
					.setTooltip("Move up")
					.onClick(async () => {
						arrayMove(this.plugin.settings.messageDistributionRules, index, index - 1);
						await this.plugin.saveSettings();
						await this.display();
					});
			});
			setting.addExtraButton((btn) => {
				btn.setIcon("down-chevron-glyph")
					.setTooltip("Move down")
					.onClick(async () => {
						arrayMove(this.plugin.settings.messageDistributionRules, index, index + 1);
						await this.plugin.saveSettings();
						await this.display();
					});
			});
			setting.addExtraButton((extra) => {
				extra
					.setIcon("pencil")
					.setTooltip("Edit")
					.onClick(async () => {
						const messageDistributionRulesModal = new MessageDistributionRulesModal(
							this.plugin,
							this.plugin.settings.messageDistributionRules[index],
						);
						messageDistributionRulesModal.onClose = async () => {
							if (messageDistributionRulesModal.saved) await this.display();
						};
						messageDistributionRulesModal.open();
					});
			});
			setting.addExtraButton((extra) => {
				extra
					.setIcon("cross")
					.setTooltip("Delete")
					.onClick(async () => {
						this.plugin.settings.messageDistributionRules.remove(
							this.plugin.settings.messageDistributionRules[index],
						);
						if (this.plugin.settings.messageDistributionRules.length == 0) {
							displayAndLog(
								this.plugin,
								"The default message distribution rule has been created, as at least one rule must exist!",
								_15sec,
							);
							this.plugin.settings.messageDistributionRules.push(createDefaultMessageDistributionRule());
						}
						await this.plugin.saveSettings();
						await this.display();
					});
			});
		});
	}

	addDeleteMessagesFromTelegram() {
		new Setting(this.containerEl)
			.setName("Delete messages from Telegram")
			.setDesc(
				"The Telegram messages will be deleted after processing them. If disabled, the Telegram messages will be marked as processed",
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.deleteMessagesFromTelegram);
				toggle.onChange(async (value) => {
					this.plugin.settings.deleteMessagesFromTelegram = value;
					await this.plugin.saveSettings();
				});
			});
	}

	async addBetaRelease() {
		if (!this.plugin.userConnected || !(await Client.subscribedOnInsiderChannel())) return;

		const installed = "Installed\n\nRestart the plugin or Obsidian to apply the changes";

		new Setting(this.containerEl)
			.setName("Beta release")
			.setDesc("The release installation will be completed during the next loading of the plugin")
			.addButton((btn) => {
				btn.setTooltip("Install Beta Release");
				btn.setWarning();
				btn.setIcon("install");
				btn.onClick(async () => {
					const notice = new Notice("Downloading...", doNotHide);
					try {
						const betaRelease = await Client.getLastBetaRelease(this.plugin.manifest.version);
						notice.setMessage(`Installing...`);
						await replaceMainJs(this.app.vault, betaRelease.mainJs);
						this.plugin.settings.betaVersion = betaRelease.version;
						await this.plugin.saveSettings();
						notice.setMessage(installed);
					} catch (e) {
						notice.setMessage(e);
					}
				});
			})
			.addButton(async (btn) => {
				btn.setTooltip("Return to production release");
				btn.setIcon("undo-glyph");
				btn.onClick(async () => {
					if (!this.plugin.settings.betaVersion) {
						new Notice(`You already have the production version of the plugin installed`, _5sec);
						return;
					}
					const notice = new Notice("Installing...", doNotHide);
					try {
						await replaceMainJs(this.app.vault, "main-prod.js");
						this.plugin.settings.betaVersion = "";
						await this.plugin.saveSettings();
						notice.setMessage(installed);
					} catch (e) {
						notice.setMessage("Error during return to production release: " + e);
					}
				});
			});
	}

	addConnectionStatusIndicator() {
		new Setting(this.containerEl)
			.setName(connectionStatusIndicatorSettingName)
			.setDesc("Choose when you want to see the connection status indicator")
			.addDropdown((dropDown) => {
				dropDown.addOptions(ConnectionStatusIndicatorType);
				dropDown.setValue(this.plugin.settings.connectionStatusIndicatorType);
				dropDown.onChange(async (value) => {
					this.plugin.settings.connectionStatusIndicatorType = value as KeysOfConnectionStatusIndicatorType;
					this.plugin.connectionStatusIndicator?.update();
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
			"If you like this Plugin and are considering donating to support continued development, use the buttons below!",
		);
		donationDiv.appendChild(donationText);

		boostyButton.style.marginRight = "20px";
		donationDiv.appendChild(boostyButton);
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

		const topicId = getTopicId(msg);
		if (topicId) {
			const topicName = msg.text.substring(11);
			if (!topicName) throw new Error("Set topic name! example: /topicName NewTopicName");
			const newTopic: Topic = {
				name: topicName,
				chatId: msg.chat.id,
				topicId: topicId,
			};
			const topicNameIndex = this.plugin.settings.topicNames.findIndex(
				(tn) => tn.topicId == newTopic.topicId && tn.chatId == newTopic.chatId,
			);
			if (topicNameIndex > -1) {
				this.plugin.settings.topicNames[topicNameIndex].name = newTopic.name;
			} else this.plugin.settings.topicNames.push(newTopic);
			await this.plugin.saveSettings();

			const progressBarMessage = await createProgressBar(bot, msg, ProgressBarType.stored);

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
