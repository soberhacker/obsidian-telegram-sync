import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import { _5sec, displayAndLog } from "src/utils/logUtils";

export class BotSettingsModal extends Modal {
	botSetingsDiv: HTMLDivElement;
	saved = false;
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.contentEl.empty();
		this.botSetingsDiv = this.contentEl.createDiv();
		this.botSetingsDiv.createEl("h4", { text: "Bot settings" });
		this.addBotToken();
		this.addAllowedChatFromUsernamesSetting();
		this.addDeviceId();
		this.addFooterButtons();
	}

	addBotToken() {
		new Setting(this.botSetingsDiv)
			.setName("Bot token (required)")
			.setDesc("Enter your Telegram bot token.")
			.addText((text) => {
				text.setPlaceholder("example: 6123456784:AAX9mXnFE2q9WahQ")
					.setValue(this.plugin.settings.botToken)
					.onChange(async (value: string) => {
						if (!value) {
							text.inputEl.style.borderColor = "red";
							text.inputEl.style.borderWidth = "2px";
							text.inputEl.style.borderStyle = "solid";
						}
						this.plugin.settings.botToken = value;
					});
			});
	}

	addAllowedChatFromUsernamesSetting() {
		const allowedChatFromUsernamesSetting = new Setting(this.botSetingsDiv)
			.setName("Allowed chat from usernames (required)")
			.setDesc("Only messages from these usernames will be processed. At least your username must be entered.")
			.addTextArea((text) => {
				const textArea = text
					.setPlaceholder("example: soberhacker,username")
					.setValue(this.plugin.settings.allowedChatFromUsernames.join(", "))
					.onChange(async (value: string) => {
						value = value.replace(/\s/g, "");
						if (!value) {
							textArea.inputEl.style.borderColor = "red";
							textArea.inputEl.style.borderWidth = "2px";
							textArea.inputEl.style.borderStyle = "solid";
						}
						this.plugin.settings.allowedChatFromUsernames = value.split(",");
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
		const deviceIdSetting = new Setting(this.botSetingsDiv)
			.setName("Main device id")
			.setDesc(
				"Specify the device to be used for sync when running Obsidian simultaneously on multiple desktops. If not specified, the priority will shift unpredictably."
			)
			.addText((text) =>
				text
					.setPlaceholder("example: 98912984-c4e9-5ceb-8000-03882a0485e4")
					.setValue(this.plugin.settings.mainDeviceId)
					.onChange((value) => (this.plugin.settings.mainDeviceId = value))
			);

		// current device id copy to settings
		const deviceIdLink = deviceIdSetting.descEl.createDiv();
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
					displayAndLog(this.plugin, `Try to copy and paste device id manually. Error: ${error}`, _5sec);
				}
				if (inputDeviceId && inputDeviceId.value)
					this.plugin.settings.mainDeviceId = this.plugin.currentDeviceId;
			});
	}

	addFooterButtons() {
		const footerButtons = new Setting(this.contentEl.createDiv());
		footerButtons.addButton((b) => {
			b.setTooltip("Connect")
				.setIcon("checkmark")
				.onClick(async () => {
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
