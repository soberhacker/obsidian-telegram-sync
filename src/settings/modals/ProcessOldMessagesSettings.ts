import { ButtonComponent, Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import { getChatsForSearch } from "src/telegram/user/sync";

export class ProcessOldMessagesSettingsModal extends Modal {
	processOldMessagesSettingsDiv: HTMLDivElement;
	saved = false;
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.addHeader();
		await this.addChatsForSearch();
	}

	addHeader() {
		this.contentEl.empty();
		this.processOldMessagesSettingsDiv = this.contentEl.createDiv();
		this.titleEl.setText("Processing old messages settings");
	}

	async addChatsForSearch() {
		new Setting(this.processOldMessagesSettingsDiv).setName("Chats for message search").setHeading();
		this.plugin.settings.processOldMessagesSettings.chatsForSearch.forEach((chat) => {
			const setting = new Setting(this.processOldMessagesSettingsDiv);
			setting.setName(`"${chat.name}"`);
			setting.addExtraButton((btn) => {
				btn.setIcon("trash-2")
					.setTooltip("Delete")
					.onClick(async () => {
						this.plugin.settings.processOldMessagesSettings.chatsForSearch.remove(chat);
						await this.plugin.saveSettings();
						this.display();
					});
			});
		});
		new Setting(this.processOldMessagesSettingsDiv)
			.setDesc(
				"Choose chats with your connected bot in which to search for old messages. Only chats with activity in the last 30 days will be available. If no chat is chosen, old message processing will not occur",
			)
			.addButton(async (btn: ButtonComponent) => {
				btn.setButtonText("Add chats");
				btn.setClass("mod-cta");
				btn.onClick(async () => {
					this.plugin.settings.processOldMessagesSettings.chatsForSearch = await getChatsForSearch(
						this.plugin,
						30,
					);
					await this.plugin.saveSettings();
					this.display();
				});
			});
	}

	onOpen() {
		this.display();
	}
}
