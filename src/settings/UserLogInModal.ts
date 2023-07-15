import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import * as GramJs from "src/telegram/GramJs/client";
import { _15sec, _5sec, displayAndLog, displayAndLogError } from "src/utils/logUtils";

export class UserLogInModal extends Modal {
	botSetingsDiv: HTMLDivElement;
	qrCodeContainer: HTMLDivElement;
	password = "";
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.contentEl.empty();
		this.botSetingsDiv = this.contentEl.createDiv();
		this.botSetingsDiv.createEl("h4", { text: "User authorization" });
		this.addPassword();
		this.addScanner();
		this.addQrCode();
		this.addCheck();
		this.addFooterButtons();
	}

	addPassword() {
		new Setting(this.botSetingsDiv)
			.setName("1. Enter password (optionally)")
			.setDesc(
				"Enter your password before scanning QR code only if you use two-step authorization. Password will not be stored"
			)
			.addText((text) => {
				text.setPlaceholder("*************")
					.setValue("")
					.onChange(async (value: string) => {
						this.password = value;
					});
			});
	}

	addScanner() {
		new Setting(this.botSetingsDiv)
			.setName("2. Prepare QR code scanner")
			.setDesc("Open Telegram on your phone. Go to Settings > Devices > Link Desktop Device");
	}

	addQrCode() {
		new Setting(this.botSetingsDiv)
			.setName("3. Generate & scan QR code")
			.setDesc(`Generate QR code and point your phone at it to confirm login`)
			.addButton((b) => {
				b.setButtonText("Generate QR code");
				b.onClick(async () => {
					startQrCodeGenerating();
					try {
						await this.plugin.initTelegramClient("user");
						await GramJs.signInAsUserWithQrCode(this.qrCodeContainer, this.password);
						if (await GramJs.isAuthorizedAsUser()) {
							this.plugin.userConnected = true;
							displayAndLog(this.plugin, "Successfully logged in", _5sec);
						}
					} catch (e) {
						errorQrCodeGenerating(e);
						await displayAndLogError(this.plugin, e, undefined, _15sec);
					}
				});
			});
		this.qrCodeContainer = this.botSetingsDiv.createDiv({
			cls: "qr-code-container",
		});
	}

	addCheck() {
		new Setting(this.botSetingsDiv)
			.setName("4. Check active sessions")
			.setDesc(
				`If the login is successful, you will find the 'Obsidian Telegram Sync' session in the list of active sessions. If you find it in the list of inactive sessions, then you have probably entered the wrong password`
			);
	}
	addFooterButtons() {
		const footerButtons = new Setting(this.contentEl.createDiv());
		footerButtons.addButton((b) => {
			b.setIcon("checkmark");
			b.setButtonText("ok");
			b.onClick(async () => this.close());
		});
	}

	onOpen() {
		this.display();
	}
}

function cleanQrContainer() {
	while (this.qrCodeContainer.firstChild) {
		this.qrCodeContainer.removeChild(this.qrCodeContainer.firstChild);
	}
}

function startQrCodeGenerating() {
	cleanQrContainer();
	// Create a new HTML element for the loading message
	const loadingMessage = this.qrCodeContainer.createDiv("QR code\ngenerating...");
	loadingMessage.style.color = "blue";
}

function errorQrCodeGenerating(e: Error) {
	cleanQrContainer();
	// Create a new HTML element for the error message
	const errorMessage = this.qrCodeContainer.createDiv(e);
	errorMessage.style.color = "red";
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
