import { Modal, Setting } from "obsidian";
import TelegramSyncPlugin from "src/main";
import { _5sec } from "src/utils/logUtils";
import {
	ConnectionStatusIndicatorType,
	KeysOfConnectionStatusIndicatorType,
	connectionStatusIndicatorSettingName,
} from "src/ConnectionStatusIndicator";

export class AdvancedSettingsModal extends Modal {
	advancedSettingsDiv: HTMLDivElement;
	saved = false;
	constructor(public plugin: TelegramSyncPlugin) {
		super(plugin.app);
	}

	async display() {
		this.addHeader();

		this.addConnectionStatusIndicator();
		this.addDeleteMessagesFromTelegram();
		this.addMessageDelimiterSetting();
		this.addParallelMessageProcessing();
		this.addTranscribeVia3rdParty();
	}

	addHeader() {
		this.contentEl.empty();
		this.advancedSettingsDiv = this.contentEl.createDiv();
		this.titleEl.setText("Advanced settings");
	}

	addMessageDelimiterSetting() {
		new Setting(this.advancedSettingsDiv)
			.setName(`Default delimiter "***" between messages`)
			.setDesc("Turn off for using a custom delimiter, which you can set in the template file")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.defaultMessageDelimiter);
				toggle.onChange(async (value) => {
					this.plugin.settings.defaultMessageDelimiter = value;
					await this.plugin.saveSettings();
				});
			});
	}

	addParallelMessageProcessing() {
		new Setting(this.advancedSettingsDiv)
			.setName(`Parallel message processing`)
			.setDesc("Turn on for faster message and file processing. Caution: may disrupt message order")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.parallelMessageProcessing);
				toggle.onChange(async (value) => {
					this.plugin.settings.parallelMessageProcessing = value;
					await this.plugin.saveSettings();
				});
			});
	}

	addConnectionStatusIndicator() {
		new Setting(this.advancedSettingsDiv)
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

	addDeleteMessagesFromTelegram() {
		new Setting(this.advancedSettingsDiv)
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

	addTranscribeVia3rdParty() {
		new Setting(this.advancedSettingsDiv).setName("3rd party transcription").setHeading();
		new Setting(this.advancedSettingsDiv)
			.setName("Transcribe via 3rd party")
			.setDesc(
				"Enable transcription of voice messages and audio files using a 3rd party service"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.transcription.enabled);
				toggle.onChange(async (value) => {
					this.plugin.settings.transcription.enabled = value;
					await this.plugin.saveSettings();
				});
			});
		
		new Setting(this.advancedSettingsDiv)
			.setName("Reply with transcription")
			.setDesc(
				"Reply to the original message in Telegram with the transcribed text"
			)
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.transcription.replyWithTranscription);
				toggle.onChange(async (value) => {
					this.plugin.settings.transcription.replyWithTranscription = value;
					await this.plugin.saveSettings();
				});
			});

		new Setting(this.advancedSettingsDiv)
			.setName("Command line")
			.setDesc(
				"The command to execute for transcription. Use {{input}} and {{output}} as placeholders for input and output files"
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("e.g. whisper {{input}} --output_dir {{output}}")
					.setValue(this.plugin.settings.transcription.command)
					.onChange(async (value: string) => {
						this.plugin.settings.transcription.command = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(this.advancedSettingsDiv)
			.setName("PATH variable")
			.setDesc(
				"Additional PATH environment variable for the transcription command"
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("e.g. /usr/local/bin:/opt/homebrew/bin")
					.setValue(this.plugin.settings.transcription.path)
					.onChange(async (value: string) => {
						this.plugin.settings.transcription.path = value;
						await this.plugin.saveSettings();
					});
			});

		new Setting(this.advancedSettingsDiv)
			.setName("Transcription template")
			.setDesc(
				"Template for inserting transcription into notes. Use {text} as a placeholder for the transcribed text"
			)
			.addTextArea((text) => {
				text
					.setPlaceholder("e.g. Transcription:\n{text}")
					.setValue(this.plugin.settings.transcription.template)
					.onChange(async (value: string) => {
						this.plugin.settings.transcription.template = value;
						await this.plugin.saveSettings();
					});
			});
	}

	onOpen() {
		this.display();
	}
}
