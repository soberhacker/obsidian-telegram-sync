import { Plugin, TFile } from 'obsidian';
import {
  DEFAULT_SETTINGS,
  TelegramSyncSettings,
  TelegramSyncSettingTab,
} from "./settings/Settings";
import TelegramBot from 'node-telegram-bot-api';
import { getFileObject, getFormattedMessage, messageDate2DateString, messageDate2TimeString, sanitizeFileName } from './utils/TelegramUtils';
import * as async from 'async';

// Main class for the Telegram Sync plugin
export default class TelegramSyncPlugin extends Plugin {
  settings: TelegramSyncSettings;
  private connected: boolean = false;
  private bot: TelegramBot | null = null;
  private messageQueueToTelegramMd: async.QueueObject<any>;
  private listOfNotePaths: string[] = [];

  // Load the plugin, settings, and initialize the bot
  async onload() {
    await this.loadSettings();

    // Add a settings tab for this plugin
    this.addSettingTab(new TelegramSyncSettingTab(this));

    // Initialize the Telegram bot
    await this.initTelegramBot();

    // Create a queue to handle appending messages to the Telegram.md file
    this.messageQueueToTelegramMd = async.queue(async (task: any, callback: any) => {
      await this.appendMessageToTelegramMd(task.msg, task.formattedContent);
      callback();
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
  async applyTemplate(templatePath: string, content: string, date: string, time: string): Promise<string> {
    let templateFile = this.app.vault.getAbstractFileByPath(templatePath) as TFile;
    if (!templateFile) {
      return content;
    }
    const templateContent = await this.app.vault.read(templateFile);
    return templateContent.replace('{{content}}', content)
      .replace(/{{date:(.*?)}}/g, (_, format) => date.format(format))
      .replace(/{{time:(.*?)}}/g, (_, format) => time.format(format));
  }

  async appendMessageToTelegramMd(msg: TelegramBot.Message, formattedContent: string) {
    // Do not append messages if not connected
    if (!this.connected) return;

    if (formattedContent === '') {
      await this.handleFiles(msg);
      await this.deleteMessage(msg);
      return;
    }

    // Determine the location for the Telegram.md file
    const location = this.settings.newNotesLocation || '';

    const telegramMdPath = location ? `${location}/Telegram.md` : 'Telegram.md';
    let telegramMdFile = this.app.vault.getAbstractFileByPath(telegramMdPath) as TFile;

    // Create or modify the Telegram.md file
    if (!telegramMdFile) {
      telegramMdFile = await this.app.vault.create(telegramMdPath, formattedContent);
    } else {
      const fileContent = await this.app.vault.read(telegramMdFile);
      await this.app.vault.modify(telegramMdFile, `${fileContent}***\n${formattedContent}\n`);
    }
    await this.handleFiles(msg);
    await this.deleteMessage(msg);
  }

  // Handle files received in messages
  async handleFiles(msg: TelegramBot.Message) {
    const fileTypes = ['photo', 'video', 'voice', 'document', 'audio', 'video_note'];
    const basePath = this.settings.newFilesLocation || this.settings.newNotesLocation || '';

    // Iterate through each file type
    for (const fileType of fileTypes) {
      
      // Get the file object for the current file type
      const fileObject = getFileObject(msg, fileType);
      if (fileObject) {
        const fileObjectToUse = fileObject instanceof Array ? fileObject.pop() : fileObject;
        const fileId = fileObjectToUse.file_id;
        const fileLink = await this.bot?.getFileLink(fileId);
        const telegramFileName = fileLink?.split('/').pop();
        const path = require('path');
        const fileExtension = path.extname(telegramFileName);
        const fileName = path.basename(telegramFileName, fileExtension);

        // Create a specific folder for each file type
        const specificFolder = `${basePath}/${fileType}s`;
        await this.app.vault.adapter.mkdir(specificFolder);

        // Format the file name and path
        const messageDate = new Date(msg.date * 1000);
        const messageDateString = messageDate2DateString(messageDate);
        const messageTimeString = messageDate2TimeString(messageDate);

        const fileFullName = `${fileName} - ${messageDateString}${messageTimeString}${fileExtension}`;
        const filePath = `${specificFolder}/${fileFullName}`;

        // Download the file and write it to the vault
        const fileStream = this.bot?.getFileStream(fileId);
        const fileChunks: Uint8Array[] = [];

        if (!fileStream) {
          return;
        }

        for await (const chunk of fileStream) {
          fileChunks.push(new Uint8Array(chunk));
        }

        const fileByteArray = new Uint8Array(fileChunks.reduce<number[]>((acc, val) => { acc.push(...val); return acc; }, []));
        await this.app.vault.adapter.writeBinary(filePath, fileByteArray);

        // Handle message captions and append to Telegram.md if necessary
        if (msg.caption && !(msg.caption === '')) {
          const captionMarkdown = `![](${filePath.replace(/\s/g, "%20")})\n${msg.caption}`;
          const formattedContent = await this.applyTemplate(this.settings.templateFileLocation, captionMarkdown, messageDateString, messageTimeString);
          if (this.settings.appendAllToTelegramMd) {
            this.messageQueueToTelegramMd.push({ msg, formattedContent });
          } else {
            // Save caption as a separate note
            const noteLocation = this.settings.newNotesLocation || '';
            const title = sanitizeFileName(msg.caption.slice(0, 20));
            let fileCaptionName = `${title} - ${messageDateString}${messageTimeString}.md`;
            let notePath = noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName;

            while (this.listOfNotePaths.includes(notePath) ||
              this.app.vault.getAbstractFileByPath(notePath) instanceof TFile) {
              const newMessageTimeString = messageDate2TimeString(messageDate);
              fileCaptionName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
              notePath = noteLocation ? `${noteLocation}/${fileCaptionName}` : fileCaptionName;
            }
            this.listOfNotePaths.push(notePath);
            await this.app.vault.create(notePath, formattedContent);
          }
        }
      }
    }
  }

  // Delete a message or send a confirmation reply based on settings and message age
  async deleteMessage(msg: TelegramBot.Message) {
    const currentTime = new Date();
    const messageTime = new Date(msg.date * 1000);
    const timeDifference = currentTime.getTime() - messageTime.getTime();
    const hoursDifference = timeDifference / (1000 * 60 * 60);

    if (this.settings.deleteMessagesFromTelegram && hoursDifference <= 48) {
      // Send the initial progress bar
      const progressBarMessage = await this.bot?.sendMessage(msg.chat.id, '.', {
        reply_to_message_id: msg.message_id,
        reply_markup: { inline_keyboard: this.createProgressBarKeyboard(0).inline_keyboard },
      });

      // Update the progress bar during the delay
      for (let i = 1; i <= 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 300 ms delay between updates
        await this.bot?.editMessageReplyMarkup(
            {
                inline_keyboard: this.createProgressBarKeyboard(i).inline_keyboard,
            },
            { chat_id: msg.chat.id, message_id: progressBarMessage?.message_id },
        );
      }

      await this.bot?.deleteMessage(msg.chat.id, msg.message_id);

      if (progressBarMessage) {
        await this.bot?.deleteMessage(msg.chat.id, progressBarMessage.message_id);
      }
    } else {
      // Send a confirmation reply if the message is too old to be deleted
      await this.bot?.sendMessage(msg.chat.id, "⬅️✅", { reply_to_message_id: msg.message_id });
    }
  }

  // Create a progress bar keyboard for message deletion
  createProgressBarKeyboard(progress: number) {
    const progressBar = '▓'.repeat(progress) + '░'.repeat(10 - progress);
    return {
        inline_keyboard: [
            [
                {
                    text: progressBar,
                    callback_data: JSON.stringify({ action: 'update_progress', progress: progress }),
                },
            ],
        ],
    };
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

    // Set connected flag to true when the bot starts
    this.bot.on('polling_error', () => {
      this.connected = true;
    });

    // Handle incoming messages
    this.bot.on('message', async (msg) => {
      
      let formattedContent = '';
      const appendAllToTelegramMd = this.settings.appendAllToTelegramMd;
      
      if (!msg.text || (msg.text == '')) {
        if (appendAllToTelegramMd) {
          this.messageQueueToTelegramMd.push({ msg, formattedContent });
        } else {          
          await this.handleFiles(msg);
          await this.deleteMessage(msg);
        }
        return;
      }
      const markDownText = await getFormattedMessage(msg);
      const rawText = msg.text;
      const location = this.settings.newNotesLocation || '';
      
      const templateFileLocation = this.settings.templateFileLocation;

      const messageDate = new Date(msg.date * 1000);      
      const messageDateString = messageDate2DateString(messageDate);
      const messageTimeString = messageDate2TimeString(messageDate);

      formattedContent = await this.applyTemplate(templateFileLocation, markDownText, messageDateString, messageTimeString);

      if (appendAllToTelegramMd) {
        this.messageQueueToTelegramMd.push({ msg, formattedContent });
      } else {
        const title = sanitizeFileName(rawText.slice(0, 20));
        let fileName = `${title} - ${messageDateString}${messageTimeString}.md`;
        let notePath = location ? `${location}/${fileName}` : fileName;        
        while (this.listOfNotePaths.includes(notePath) || 
              this.app.vault.getAbstractFileByPath(notePath) instanceof TFile) {          
          const newMessageTimeString = messageDate2TimeString(messageDate);
          fileName = `${title} - ${messageDateString}${newMessageTimeString}.md`;
          notePath = location ? `${location}/${fileName}` : fileName;                    
        }        
        this.listOfNotePaths.push(notePath);
        await this.app.vault.create(notePath, formattedContent);
        await this.handleFiles(msg);
        await this.deleteMessage(msg);
      }
    });

    // Set connected flag to false and log errors when a polling error occurs
    this.bot.on('polling_error', (error: any) => {
      this.connected = false;
      console.log(error);
    });
  }
}
// TODO: test transfering files
// TODO: separate into few files