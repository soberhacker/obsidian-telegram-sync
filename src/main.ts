import { Plugin, TFile } from 'obsidian';
import {
  DEFAULT_SETTINGS,
  TelegramSyncSettings,
  TelegramSyncSettingTab,
} from "./settings/Settings";
import TelegramBot from 'node-telegram-bot-api';
import * as async from 'async';
import { handleMessage, handleFiles, deleteMessage } from './telegram/messageHandlers';
import { formatDateTime } from './utils/dateUtils';

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
  settings: TelegramSyncSettings;
  private connected: boolean = false;
  bot: TelegramBot | null = null;
  messageQueueToTelegramMd: async.QueueObject<any>;
  listOfNotePaths: string[] = [];

  // Load the plugin, settings, and initialize the bot
  async onload() {
    await this.loadSettings();

    // Add a settings tab for this plugin
    this.addSettingTab(new TelegramSyncSettingTab(this));

    // Initialize the Telegram bot
    await this.initTelegramBot();

    // Create a queue to handle appending messages to the Telegram.md file
    this.messageQueueToTelegramMd = async.queue(async (task: any) => {
      await this.appendMessageToTelegramMd(task.msg, task.formattedContent);
    }, 1);
  }

  // Load settings from the plugin's data
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  // Save settings to the plugin's data
  async saveSettings() {
    await this.saveData(this.settings);
  }

  // Apply a template to a message's content
  async applyTemplate(
    templatePath: string,
    content: string,
    messageDateTime: Date,
    forwardFromLink: string
  ): Promise<string> {

    let templateFile = this.app.vault.getAbstractFileByPath(templatePath) as TFile;
    if (!templateFile) {
      return content;
    }
    const dateTimeNow = new Date();
    const templateContent = await this.app.vault.read(templateFile);
    return templateContent
      .replace('{{content}}', content)
      .replace(/{{messageDate:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
      .replace(/{{messageTime:(.*?)}}/g, (_, format) => formatDateTime(messageDateTime, format))
      .replace(/{{date:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
      .replace(/{{time:(.*?)}}/g, (_, format) => formatDateTime(dateTimeNow, format))
      .replace(/{{forwardFrom}}/g, forwardFromLink);
  }

  async appendMessageToTelegramMd(msg: TelegramBot.Message, formattedContent: string) {
    // Do not append messages if not connected
    if (!this.connected) return;

    // Determine the location for the Telegram.md file
    const location = this.settings.newNotesLocation || '';

    const telegramMdPath = location ? `${location}/Telegram.md` : 'Telegram.md';
    let telegramMdFile = this.app.vault.getAbstractFileByPath(telegramMdPath) as TFile;

    // Create or modify the Telegram.md file
    if (!telegramMdFile) {
      telegramMdFile = await this.app.vault.create(telegramMdPath, `${formattedContent}\n`);
    } else {
      const fileContent = await this.app.vault.read(telegramMdFile);
      await this.app.vault.modify(telegramMdFile, `${fileContent}\n***\n\n${formattedContent}\n`);
    }
    await this.deleteMessage(msg);
  }

  async handleMessage(msg: TelegramBot.Message) {
    await handleMessage.call(this, msg);
  }

  // Handle files received in messages
  async handleFiles(msg: TelegramBot.Message) {
    await handleFiles.call(this, msg);
  }

  // Delete a message or send a confirmation reply based on settings and message age
  async deleteMessage(msg: TelegramBot.Message) {
    await deleteMessage.call(this, msg);
  }

  // Initialize the Telegram bot and set up message handling
  async initTelegramBot() {
    if (!this.settings.botToken) return;

    if (this.bot) {
      this.bot.stopPolling();
      this.bot = null;
      // Add a small delay before starting a new instance
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Create a new bot instance and start polling
    this.bot = new TelegramBot(this.settings.botToken, { polling: true });

    // Check if the bot is connected and set the connected flag accordingly
    if (this.bot.isPolling()) {
      this.connected = true;
    }

    this.bot.on('message', async (msg) => {
      await this.handleMessage(msg);
    });

    // Set connected flag to false and log errors when a polling error occurs
    this.bot.on('polling_error', (error: any) => {
      this.connected = false;
      console.log(error);
    });
  }
}
