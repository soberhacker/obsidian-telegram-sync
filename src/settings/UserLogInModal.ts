import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import * as Client from "src/telegram/user/client";
import * as User from "src/telegram/user/user";

export class UserLogInModal extends Modal {
	botSettingsDiv: HTMLDivElement;
	qrCodeContainer: HTMLDivElement;
	password = "";
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.contentEl.empty();
		this.botSettingsDiv = this.contentEl.createDiv();
		this.botSettingsDiv.createEl("h4", { text: "User authorization" });
		this.addPassword();
		this.addScanner();
		this.addQrCode();
		this.addCheck();
		this.addFooterButtons();
	}

	addPassword() {
		new Setting(this.botSettingsDiv)
			.setName("1. Enter password (optionally)")
			.setDesc(
				"Enter your password before scanning QR code only if you use two-step authorization. Password will not be stored",
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
		new Setting(this.botSettingsDiv)
			.setName("2. Prepare QR code scanner")
			.setDesc("Open Telegram on your phone. Go to Settings > Devices > Link Desktop Device");
	}

	addQrCode() {
		new Setting(this.botSettingsDiv)
			.setName("3. Generate & scan QR code")
			.setDesc(`Generate QR code and point your phone at it to confirm login`)
			.addButton((b) => {
				b.setButtonText("Generate QR code");
				b.onClick(async () => {
					await this.showQrCodeGeneratingState("🔵 QR code generating...\n", "#007BFF");
					try {
						await User.connect(this.plugin, "user");
						await Client.signInAsUserWithQrCode(this.qrCodeContainer, this.password);
						if (await Client.isAuthorizedAsUser()) {
							this.plugin.userConnected = true;
							await this.showQrCodeGeneratingState("🟢 Successfully logged in!\n", "#008000");
						}
					} catch (e) {
						await this.showQrCodeGeneratingState(`🔴 ${e}\n`, "#FF0000");
					}
				});
			});
		this.qrCodeContainer = this.botSettingsDiv.createDiv({
			cls: "qr-code-container",
		});
	}

	addCheck() {
		new Setting(this.botSettingsDiv)
			.setName("4. Check active sessions")
			.setDesc(
				`If the login is successful, you will find the 'Obsidian Telegram Sync' session in the list of active sessions. If you find it in the list of inactive sessions, then you have probably entered the wrong password`,
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
