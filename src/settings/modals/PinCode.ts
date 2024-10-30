import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import { _5sec } from "src/utils/logUtils";

export class PinCodeModal extends Modal {
	pinCodeDiv: HTMLDivElement;
	saved = false;
	constructor(
		public plugin: TelegramSyncPlugin,
		public decrypt = false,
	) {
		super(plugin.app);
	}

	async display() {
		this.addHeader();
		this.addPinCode();
		this.addFooterButtons();
	}

	success = async () => {
		this.saved = true;
		this.close();
	};

	addHeader() {
		this.contentEl.empty();
		this.pinCodeDiv = this.contentEl.createDiv();
		this.titleEl.setText("Telegram Sync: " + (this.decrypt ? "Decrypting" : "Encrypting") + "  bot token");
	}

	addPinCode() {
		new Setting(this.pinCodeDiv)
			.setName("PIN code")
			.setDesc("Enter your PIN code. Numbers and letters only.")
			.addText((text) => {
				text.setPlaceholder("example: 1234").onChange(async (value: string) => {
					if (!value) {
						text.inputEl.style.borderColor = "red";
						text.inputEl.style.borderWidth = "2px";
						text.inputEl.style.borderStyle = "solid";
					}
					this.plugin.pinCode = value;
				});
				text.inputEl.addEventListener("keydown", (event: KeyboardEvent) => {
					if (!(event.key === "Enter")) return;
					this.success.call(this);
				});
			});
	}

	addFooterButtons() {
		this.pinCodeDiv.createEl("br");
		const footerButtons = new Setting(this.contentEl.createDiv());
		footerButtons.addButton((b) => {
			b.setTooltip("Connect").setIcon("checkmark").onClick(this.success);
			return b;
		});
		footerButtons.addExtraButton((b) => {
			b.setIcon("cross")
				.setTooltip("Cancel")
				.onClick(async () => {
					this.saved = false;
					this.plugin.pinCode = undefined;
					this.close();
				});
			return b;
		});
	}

	onOpen() {
		this.display();
	}
}
