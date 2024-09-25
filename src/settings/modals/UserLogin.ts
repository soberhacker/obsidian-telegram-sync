import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import * as User from "src/telegram/user/user";

export class UserLogInModal extends Modal {
	userLoginDiv: HTMLDivElement;
	qrCodeContainer: HTMLDivElement;
	password = "";
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.addHeader();
		this.addPassword();
		this.addScanner();
		await this.addQrCode();
		this.addCheck();
		this.addFooterButtons();
	}

	addHeader() {
		this.contentEl.empty();
		this.userLoginDiv = this.contentEl.createDiv();
		this.titleEl.setText("User authorization");
	}

	addPassword() {
		new Setting(this.userLoginDiv)
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
		new Setting(this.userLoginDiv)
			.setName("2. Prepare QR code scanner")
			.setDesc("Open Telegram on your phone. Go to Settings > Devices > Link Desktop Device");
	}

	async addQrCode() {
		new Setting(this.userLoginDiv)
			.setName("3. Generate & scan QR code")
			.setDesc(`Generate QR code and point your phone at it to confirm login`)
			.addButton((b) => {
				b.setButtonText("Generate QR code");
				b.onClick(async () => {
					await this.showQrCodeGeneratingState("🔵 QR code generating...\n", "#007BFF");
					const error = await User.connect(
						this.plugin,
						"user",
						undefined,
						this.qrCodeContainer,
						this.password,
					);
					if (error) await this.showQrCodeGeneratingState(`🔴 ${error}\n`, "#FF0000");
					else await this.showQrCodeGeneratingState("🟢 Successfully logged in!\n", "#008000");
				});
			});
		this.qrCodeContainer = this.userLoginDiv.createDiv({
			cls: "qr-code-container",
		});
	}

	addCheck() {
		new Setting(this.userLoginDiv)
			.setName("4. Check active sessions")
			.setDesc(
				`If the login is successful, you will find the 'Obsidian Telegram Sync' session in the list of active sessions. If you find it in the list of inactive sessions, then you have probably entered the wrong password`,
			);
	}
	addFooterButtons() {
		this.userLoginDiv.createEl("br");
		const footerButtons = new Setting(this.contentEl.createDiv());
		footerButtons.addButton((b) => {
			b.setIcon("checkmark");
			b.setButtonText("ok");
			b.onClick(async () => this.close());
		});
	}

	async onOpen() {
		await this.display();
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
		message.style.whiteSpace = "pre-wrap";
	}
}
