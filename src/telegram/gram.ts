import { Api, TelegramClient } from "telegram";
import { StoreSession } from "telegram/sessions";
import QRCode from "qrcode";
import { PromisedWebSockets } from "telegram/extensions/PromisedWebSockets";
import TelegramBot from "node-telegram-bot-api";


let client: TelegramClient;
let _api_id: number;
let _api_hash: string;
let inputPeerUser: Api.InputPeerUser;

export async function init(api_id: number, api_hash: string, botName?: string, password?: string, container?: HTMLDivElement) {  
  if (!client || client.apiId !== api_id || client.apiHash !== api_hash ) {
    const session = new StoreSession("obsidian_telegram_sync_session");   
    _api_id = api_id;
    _api_hash = api_hash;    
    client = new TelegramClient(session, api_id, api_hash, {
      connectionRetries: 1,
      deviceModel: "Obsidian Telegram",
      useWSS: true,
      networkSocket: PromisedWebSockets
    });
  }
  
  if (!client.connected) {
    await client.connect();      
  }

  if (!await client.checkAuthorization() && container) {
    await client.signInUserWithQrCode({ apiId: _api_id, apiHash: _api_hash}, {
      qrCode: async (qrCode) => {          
        const url = 'tg://login?token=' + qrCode.token.toString('base64');                  
        let qrCodeSvg = await QRCode.toString(url, { type: "svg" });
        qrCodeSvg = qrCodeSvg.replace('<svg', `<svg width="${150}" height="${150}"`);
        container.innerHTML = qrCodeSvg;
      },
      password: async (hint) => {return password ? password : ''},
      onError: (error) => {        
        container.innerHTML = error.message;
        console.log(error);
      }
    })    
  }      

  if (await client.checkAuthorization()) {
    const searchResult = await client.invoke(
      new Api.contacts.ResolveUsername( {
      username: botName,
    }));
  
    const botUser: any = searchResult.users[0];
    inputPeerUser = new Api.InputPeerUser({ userId: botUser.id, accessHash: botUser.accessHash});
  }
}

export async function sendReaction(botMsg: TelegramBot.Message) {  
  
  const messages = await client.getMessages(inputPeerUser);
  
  const clientMsg = messages.find((m) => m.text == botMsg.text);

  await client.invoke(
    new Api.messages.SendReaction({
      peer: inputPeerUser,
      msgId: clientMsg?.id,
      reaction: [new Api.ReactionEmoji({emoticon: '👍' })]
    }));
    
}