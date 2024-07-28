import TelegramSyncPlugin from "src/main";
import { App, ButtonComponent, Notice, PluginSettingTab, Setting, TextComponent } from "obsidian";
import TelegramBot from "node-telegram-bot-api";
import { createProgressBar, updateProgressBar, deleteProgressBar, ProgressBarType } from "src/telegram/bot/progressBar";
import * as Client from "src/telegram/user/client";
import { BotSettingsModal } from "./modals/BotSettings";
import { UserLogInModal } from "./modals/UserLogin";
import { releaseVersion, versionALessThanVersionB, telegramChannelLink, privacyPolicyLink } from "release-notes.mjs";
import { _15sec, _1sec, _5sec, displayAndLog, doNotHide } from "src/utils/logUtils";
import { getTopicId } from "src/telegram/bot/message/getters";
import * as User from "../telegram/user/user";
import { replaceMainJs } from "src/utils/fsUtils";
import { KeysOfConnectionStatusIndicatorType } from "src/ConnectionStatusIndicator";
import { enqueue } from "src/utils/queues";
import {
	MessageDistributionRule,
	createDefaultMessageDistributionRule,
	getMessageDistributionRuleInfo,
} from "./messageDistribution";
import { MessageDistributionRulesModal } from "./modals/MessageDistributionRules";
import { arrayMove } from "src/utils/arrayUtils";
import {
	ProcessOldMessagesSettings,
	clearCachedUnprocessedMessages,
	getDefaultProcessOldMessagesSettings,
} from "src/telegram/user/sync";
import { AdvancedSettingsModal } from "./modals/AdvancedSettings";
import { ProcessOldMessagesSettingsModal } from "./modals/ProcessOldMessagesSettings";
import { getOffsetDate } from "src/utils/dateUtils";
import OpenAI from "openai";

export interface Topic {
	name: string;
	chatId: number;
	topicId: number;
}

export interface RefreshValues {
	botConnected?: boolean;
	userConnected?: boolean;
	checkingBotConnection?: boolean;
	checkingUserConnection?: boolean;
	telegramSessionType?: string;
}

export interface TelegramSyncSettings {
	botToken: string;
	deleteMessagesFromTelegram: boolean;
	allowedChats: string[];
	mainDeviceId: string;
	pluginVersion: string;
	telegramSessionType: Client.SessionType;
	telegramSessionId: number;
	betaVersion: string;
	connectionStatusIndicatorType: KeysOfConnectionStatusIndicatorType;
	cacheCleanupAtStartup: boolean;
	messageDistributionRules: MessageDistributionRule[];
	defaultMessageDelimiter: boolean;
	parallelMessageProcessing: boolean;
	processOldMessages: boolean;
	processOldMessagesSettings: ProcessOldMessagesSettings;
	processOtherBotsMessages: boolean;
	retryFailedMessagesProcessing: boolean;
	// add new settings above this line
	openAIKey: string; // Новое поле для OpenAI API ключа
	topicNames: Topic[];
}

export const DEFAULT_SETTINGS: TelegramSyncSettings = {
	botToken: "",
	deleteMessagesFromTelegram: false,
	allowedChats: [""],
	mainDeviceId: "",
	pluginVersion: "",
	telegramSessionType: "bot",
	telegramSessionId: Client.getNewSessionId(),
	betaVersion: "",
	connectionStatusIndicatorType: "CONSTANT",
	cacheCleanupAtStartup: false,
	messageDistributionRules: [createDefaultMessageDistributionRule()],
	defaultMessageDelimiter: true,
	parallelMessageProcessing: false,
	processOldMessages: false,
	processOldMessagesSettings: getDefaultProcessOldMessagesSettings(),
	processOtherBotsMessages: false,
	retryFailedMessagesProcessing: false,
	// add new settings above this line
	topicNames: [],
	openAIKey: "", // Значение по умолчанию
};

export class TelegramSyncSettingTab extends PluginSettingTab {
	plugin: TelegramSyncPlugin;
	subscribedOnInsiderChannel: boolean;
	refreshValues: RefreshValues;
	refreshIntervalId: NodeJS.Timer;

	constructor(app: App, plugin: TelegramSyncPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.subscribedOnInsiderChannel = false;
	}

	async refresh() {
		const botConnected = this.plugin.isBotConnected();
		const userConnected = this.plugin.userConnected;
		const checkingBotConnection = this.plugin.checkingBotConnection;
		const checkingUserConnection = this.plugin.checkingUserConnection;
		const telegramSessionType = this.plugin.settings.telegramSessionType;
		if (
			!this.refreshValues ||
			botConnected != this.refreshValues.botConnected ||
			userConnected != this.refreshValues.userConnected ||
			checkingBotConnection != this.refreshValues.checkingBotConnection ||
			checkingUserConnection != this.refreshValues.checkingUserConnection ||
			telegramSessionType != this.plugin.settings.telegramSessionType
		) {
			try {
				if (!this.refreshValues) this.refreshValues = {};
				else await this.display();
			} finally {
				this.refreshValues.botConnected = botConnected;
				this.refreshValues.userConnected = userConnected;
				this.refreshValues.checkingBotConnection = checkingBotConnection;
				this.refreshValues.checkingUserConnection = checkingUserConnection;
				this.refreshValues.telegramSessionType = this.plugin.settings.telegramSessionType;
			}
		}
	}

	async setRefreshInterval() {
		clearInterval(this.refreshIntervalId);
		this.refreshIntervalId = setInterval(async () => {
			await enqueue(this, this.refresh);
		}, _1sec);
	}

	async display(): Promise<void> {
		this.containerEl.empty();
		this.addSettingsHeader();

		await this.addBot();
		await this.addUser();
		await this.addOpenAIKey();
		this.addAdvancedSettings();

		new Setting(this.containerEl).setName("Message distribution rules").setHeading();
		await this.addMessageDistributionRules();

		new Setting(this.containerEl).setName("Insider features").setHeading();
		this.subscribedOnInsiderChannel = await Client.subscribedOnInsiderChannel();
		await this.addProcessOldMessages();
		await this.addBetaRelease();
		this.addTelegramChannel();
		await this.setRefreshInterval();
	}

	hide() {
		super.hide();
		clearInterval(this.refreshIntervalId);
	}

	addSettingsHeader() {
		const versionContainer = this.containerEl.createDiv();
		versionContainer.style.display = "flex";
		versionContainer.style.justifyContent = "space-between";
		versionContainer.createSpan().createEl("h1", {
			text: `Telegram Sync ${
				versionALessThanVersionB(this.plugin.manifest.version, this.plugin.settings.betaVersion)
					? this.plugin.settings.betaVersion
					: releaseVersion
			}`,
		});

		const privacyPolicyButton = versionContainer.createSpan().createEl("a", {
			text: "Privacy Policy",
			href: privacyPolicyLink,
		});
		privacyPolicyButton.style.fontSize = "0.75em";
		privacyPolicyButton.style.color = "LightCoral";
		privacyPolicyButton.style.textDecoration = "None";

		this.containerEl.createEl("div", { text: "Created by " }).createEl("a", {
			text: "soberhacker🍃🧘💻",
			href: "https://github.com/soberhacker",
		});

		this.containerEl.createEl("br");
		this.containerEl.createEl("br");
	}

	async addBot() {
		const botSettings = new Setting(this.containerEl)
			.setName("Bot (required)")
			.setDesc("Connect your telegram bot. It's required for all features.")
			.addText(async (botStatus: TextComponent) => {
				botStatus.setDisabled(true);
				if (this.plugin.checkingBotConnection) {
					botStatus.setValue("⏳ connecting...");
				} else if (this.plugin.isBotConnected()) {
					botStatus.setValue(`🤖 ${this.plugin.botUser?.username || "connected"}`);
				} else {
					botStatus.setValue("❌ disconnected");
				}
			})
			.addButton(async (botSettingsButton: ButtonComponent) => {
				if (this.plugin.checkingBotConnection) botSettingsButton.setButtonText("Restart");
				else if (this.plugin.isBotConnected()) botSettingsButton.setButtonText("Settings");
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
							await enqueue(this.plugin, this.plugin.initTelegram);
						}
					};
					botSettingsModal.open();
				});
			});
		// add link to botFather
		const botFatherLink = document.createElement("div");
		botFatherLink.textContent = "To create a new bot click on -> ";
		botFatherLink.createEl("a", {
			href: "https://t.me/botfather",
			text: "@botFather",
		});
		botSettings.descEl.appendChild(botFatherLink);
	}

	async addUser() {
		const userSettings = new Setting(this.containerEl)
			.setName("User (optionally)")
			.setDesc("Connect your telegram user. It's required only for ")
			.addText(async (userStatus: TextComponent) => {
				userStatus.setDisabled(true);
				if (this.plugin.checkingUserConnection) {
					userStatus.setValue("⏳ connecting...");
				} else if (this.plugin.userConnected) {
					userStatus.setValue(`👨🏽‍💻 ${Client.clientUser?.username || "connected"}`);
				} else userStatus.setValue("❌ disconnected");
			})
			.addButton(async (userLogInButton: ButtonComponent) => {
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
					} else {
						// Log In
						const initialSessionType = this.plugin.settings.telegramSessionType;
						const userLogInModal = new UserLogInModal(this.plugin);
						userLogInModal.onClose = async () => {
							if (initialSessionType == "bot" && !this.plugin.userConnected) {
								this.plugin.settings.telegramSessionType = initialSessionType;
								await this.plugin.saveSettings();
							}
						};
						userLogInModal.open();
					}
				});
			});
		if (this.plugin.settings.telegramSessionType == "user" && !this.plugin.userConnected) {
			userSettings.addExtraButton(async (refreshButton) => {
				refreshButton.setTooltip("Refresh");
				refreshButton.setIcon("refresh-ccw");
				refreshButton.onClick(async () => {
					await User.connect(this.plugin, "user", this.plugin.settings.telegramSessionId);
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
	async addOpenAIKey() {
		// Создание нового блока настроек для OpenAI API Key
		new Setting(this.containerEl)
			.setName("OpenAI API Key")
			.setDesc("Provide your OpenAI API key for text generation features.")
			.addText((apiKeyInput: TextComponent) => {
				apiKeyInput.setValue(this.plugin.settings.openAIKey || "").onChange(async (value) => {
					this.plugin.settings.openAIKey = value;
					await this.plugin.saveSettings(); // Сохранение настроек
				});
			})
			.addButton((apiKeyCheckButton: ButtonComponent) => {
				apiKeyCheckButton
					.setButtonText("Validate")
					.setCta()
					.onClick(async () => {
						const apiKey = this.plugin.settings.openAIKey;
						if (apiKey) {
							try {
								// Создаем экземпляр OpenAI с текущим ключом
								const openai = new OpenAI({
									apiKey: apiKey,
									dangerouslyAllowBrowser: true, // Используйте с осторожностью
								});
								// Проверка API ключа путем запроса списка моделей
								await openai.models.list();
								displayAndLog(this.plugin, "API Key is valid!", _5sec);
							} catch (error) {
								console.error("Error validating API Key:", error);
								displayAndLog(this.plugin, "Invalid API Key. Please check and try again.", _5sec);
							}
						} else {
							displayAndLog(this.plugin, "API Key cannot be empty.", _5sec);
						}
					});
			});
	}
	addAdvancedSettings() {
		new Setting(this.containerEl).addButton((btn: ButtonComponent) => {
			btn.setButtonText("Advanced settings");
			btn.setClass("mod-cta");
			btn.onClick(async () => {
				const advancedSettingsModal = new AdvancedSettingsModal(this.plugin);
				advancedSettingsModal.open();
			});
		});
	}

	async addMessageDistributionRules() {
		this.plugin.settings.messageDistributionRules.forEach((rule, index) => {
			const ruleInfo = getMessageDistributionRuleInfo(rule);
			const setting = new Setting(this.containerEl);
			setting.setName(ruleInfo.name);
			setting.setDesc(ruleInfo.description);
			setting.addExtraButton(async (btn) => {
				btn.setIcon("up-chevron-glyph")
					.setTooltip("Move up")
					.onClick(async () => {
						arrayMove(this.plugin.settings.messageDistributionRules, index, index - 1);
						await this.plugin.saveSettings();
						await this.display();
					});
			});
			setting.addExtraButton(async (btn) => {
				btn.setIcon("down-chevron-glyph")
					.setTooltip("Move down")
					.onClick(async () => {
						arrayMove(this.plugin.settings.messageDistributionRules, index, index + 1);
						await this.plugin.saveSettings();
						await this.display();
					});
			});
			setting.addExtraButton(async (btn) => {
				btn.setIcon("pencil")
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
			setting.addExtraButton(async (btn) => {
				btn.setIcon("trash-2")
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

		new Setting(this.containerEl).addButton(async (btn: ButtonComponent) => {
			btn.setButtonText("Add rule");
			btn.setClass("mod-cta");
			btn.onClick(async () => {
				const messageDistributionRulesModal = new MessageDistributionRulesModal(this.plugin);
				messageDistributionRulesModal.onClose = async () => {
					if (messageDistributionRulesModal.saved) await this.display();
				};
				messageDistributionRulesModal.open();
			});
		});
	}

	async addBetaRelease() {
		const disabled = !this.plugin.userConnected || !this.subscribedOnInsiderChannel;

		const installed = "Installed\n\nRestart the plugin or Obsidian to apply the changes";

		new Setting(this.containerEl)
			.setName("Beta release")
			.setDesc(
				"Install the latest beta release to be among the first to try out new features. It will launch during the plugin's next load",
			)
			.addButton(async (btn) => {
				btn.setDisabled(disabled);
				btn.setTooltip("Install Beta Release");
				btn.setWarning();
				btn.setIcon("install");
				btn.onClick(async () => {
					const notice = new Notice("Downloading...", doNotHide);
					try {
						const betaRelease = await Client.getLastBetaRelease(this.plugin.manifest.version);
						notice.setMessage(`Installing...`);
						await replaceMainJs(this.app.vault, betaRelease.mainJs);
						this.plugin.settings.betaVersion = betaRelease.betaVersion;
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
				btn.setDisabled(disabled);
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

	async addProcessOldMessages() {
		const disabled = !this.plugin.userConnected || !this.subscribedOnInsiderChannel;

		new Setting(this.containerEl)
			.setName("Process old messages")
			.setDesc(
				"During the plugin loading, unprocessed messages that are older than 24 hours and are not accessible to the bot will be forwarded to the same chat using the connected user's account. This action will enable the bot to detect and process these messages",
			)
			.addButton((btn) => {
				btn.setIcon("settings");
				btn.setTooltip("Settings");
				btn.setDisabled(disabled);
				btn.onClick(async () => {
					const processOldMessagesSettingsModal = new ProcessOldMessagesSettingsModal(this.plugin);
					processOldMessagesSettingsModal.open();
				});
			})
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.processOldMessages);
				toggle.setDisabled(disabled);
				toggle.onChange(async (value) => {
					if (!value) clearCachedUnprocessedMessages();
					else this.plugin.settings.processOldMessagesSettings.lastProcessingDate = getOffsetDate();
					this.plugin.settings.processOldMessages = value;

					await this.plugin.saveSettings();
				});
			});
	}

	addTelegramChannel() {
		if (this.subscribedOnInsiderChannel) return;

		const telegramChannelSetting = new Setting(this.containerEl)
			.setName("Telegram plugin's channel")
			.setDesc(
				"If you like this open source plugin and are considering donating to support its continued development, subscribe to the private Telegram channel. In exchange, you will be the first to get all the latest updates and secrets🤫, as well as gain access to beta versions and ",
			);
		telegramChannelSetting.descEl.createEl("a", {
			href: "https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Telegram%20Sync%20Insider%20Features.md",
			text: "insider features",
		});
		new Setting(this.containerEl).addButton((btn: ButtonComponent) => {
			btn.setButtonText("Subscribe & Unlock features");
			btn.setClass("mod-cta");
			btn.onClick(async () => {
				displayAndLog(
					this.plugin,
					"After channel subscription, connect your Telegram user (if not done) and refresh the plugin settings for insider features",
				);
				window.open(telegramChannelLink, "_blank");
			});
		});
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

			const progressBarMessage = await createProgressBar(bot, msg, ProgressBarType.STORED);

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
