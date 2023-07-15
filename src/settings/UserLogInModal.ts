import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import * as GramJs from "src/telegram/GramJs/client";

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
					await this.showQrCodeGeneratingState("🔵 QR code generating...\n", "#007BFF");
					try {
						await this.plugin.initTelegramClient("user");
						await GramJs.signInAsUserWithQrCode(this.qrCodeContainer, this.password);
						if (await GramJs.isAuthorizedAsUser()) {
							this.plugin.userConnected = true;
							await this.showQrCodeGeneratingState("🟢 Successfully logged in!\n", "#008000");
						}
					} catch (e) {
						await this.showQrCodeGeneratingState(`🔴 ${e}\n`, "#FF0000");
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

	cleanQrContainer() {
		while (this.qrCodeContainer.firstChild) {
			this.qrCodeContainer.removeChild(this.qrCodeContainer.firstChild);
		}
	}

	async showQrCodeGeneratingState(text: string, color?: string) {
		this.cleanQrContainer();
		const message = this.qrCodeContainer.createEl("pre", { text });
		if (color) message.style.color = color;
		message.style.fontWeight = "bold";
	}
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
