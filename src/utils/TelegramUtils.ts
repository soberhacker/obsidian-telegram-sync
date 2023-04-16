import TelegramBot from "node-telegram-bot-api";

export function messageDate2DateString(date: Date) : string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

export function messageDate2TimeString(date: Date) : string {
    date.setMilliseconds((new Date()).getMilliseconds());
    return date.toISOString().split('T')[1]
      .replace(/:/g, '').replace('.', '').replace('Z', '').substring(0, 12);
  }

export function sanitizeFileName(fileName: string): string {
    const invalidCharacters = /[\\/:*?"<>|\n\r]/g;
    const replacementCharacter = '_';
    return fileName.replace(invalidCharacters, replacementCharacter);
  }

export async function getFormattedMessage(msg: TelegramBot.Message): Promise<string> {
    let text = msg.text || '';
  
    if (msg.entities) {
      let offset = 0;
      for (const entity of msg.entities) {
        const entityStart = entity.offset + offset;
        let entityEnd = entityStart + entity.length;
  
        let entityText = text.slice(entityStart, entityEnd);
        
        if (entityText.endsWith('\n')) {
          entityEnd = entityEnd - 1;
        }
        const beforeEntity = text.slice(0, entityStart);
        entityText = text.slice(entityStart, entityEnd);
        const afterEntity = text.slice(entityEnd);          
  
        switch (entity.type) {
          case 'bold':
            entityText = `**${entityText}**`;
            offset += 4;
            break;
          case 'italic':
            entityText = `*${entityText}*`;
            offset += 2;
            break;
          case 'underline':
            entityText = `<u>${entityText}</u>`;
            offset += 7;
            break;
          case 'strikethrough':
            entityText = `~~${entityText}~~`;
            offset += 4;
            break;
          case 'code':
            entityText = '`' + entityText + '`';
            offset += 2;
            break;
          case 'pre':
            entityText = '```' + entityText + '```';
            offset += 6;
            break;
          case 'text_link':
            if (entity.url) {
              entityText = `[${entityText}](${entity.url})`;  
              offset += 4 + entity.url.length;          
            }
            break;
          default:            
            break;
        }
        text = beforeEntity + entityText + afterEntity;        
      }
    }
  
    return text;
  }

  export function base64ToString(base64: string): string {
    return Buffer.from(base64, 'base64').toString('utf-8');
  }
  

  export function getFileObject(msg: TelegramBot.Message, fileType: string): any {
    switch (fileType) {
      case 'photo':
        return msg.photo;
      case 'video':
        return msg.video;
      case 'voice':
        return msg.voice;
      case 'document':
        return msg.document;
      case 'audio':
        return msg.audio;
      case 'video_note':
        return msg.video_note;
      default:
        return null;
    }
  }