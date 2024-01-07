import TelegramBot, { Message, MessageEntity, MessageEntityType } from "node-telegram-bot-api"; // Import the Message interface from node-telegram-bot-api
import { Api } from "telegram";
import { Entity } from "telegram/define";

function getChatType(entity: Entity | undefined): TelegramBot.ChatType {
	return entity instanceof Api.User
		? "private"
		: entity instanceof Api.Chat
		  ? "supergroup"
		  : entity instanceof Api.Channel
		    ? "channel"
		    : "group";
}

export function getUser(entity: Entity): TelegramBot.User | undefined {
	// Api.User | Api.Chat | Api.Channel
	if (entity instanceof Api.User)
		return {
			id: entity.id.toJSNumber(),
			username: entity.username,
			first_name: entity.firstName || entity.id.toString(),
			last_name: entity.lastName,
			is_bot: entity.bot || false,
			language_code: entity.langCode,
		};
	else if (entity instanceof Api.Chat)
		return {
			id: entity.id.toJSNumber(),
			username: undefined,
			first_name: entity.title,
			is_bot: false,
		};
	else if (entity instanceof Api.Channel)
		return {
			id: entity.id.toJSNumber(),
			username: entity.username,
			first_name: entity.title,
			is_bot: false,
		};
	else return undefined;
}

export function getChat(entity: Entity): TelegramBot.Chat | undefined {
	// Api.User | Api.Chat | Api.Channel
	if (entity instanceof Api.User)
		return {
			id: entity.id.toJSNumber(),
			username: entity.username,
			title: entity.firstName + " " + entity.lastName,
			first_name: entity.firstName,
			last_name: entity.lastName,
			type: getChatType(entity),
		};
	else if (entity instanceof Api.Chat)
		return {
			id: entity.id.toJSNumber(),
			username: undefined,
			title: entity.title,
			type: getChatType(entity),
		};
	else if (entity instanceof Api.Channel)
		return {
			id: entity.id.toJSNumber(),
			username: entity.username,
			title: entity.title,
			type: getChatType(entity),
		};
	else return undefined;
}

// Mapping function
export function convertClientMsgToBotMsg(clientMsg: Api.Message): Message {
	const botChatType: TelegramBot.ChatType = getChatType(clientMsg.chat);
	const botChat: TelegramBot.Chat = { id: clientMsg.chatId?.toJSNumber() || 0, type: botChatType };
	const botMsg: Message = { chat: botChat, date: clientMsg.date, message_id: clientMsg.id };
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(botMsg as any).clientId = clientMsg.id;

	// Map similar fields
	// _TODO text must be undefined if message with file
	botMsg.text = clientMsg.message;
	botMsg.caption = clientMsg.text;
	// _TODO convert reply_markup
	//botMsg.reply_markup = clientMsg.replyMarkup;
	// Converting entities
	// _TODO caption_entities if message with file
	if (clientMsg.entities) {
		botMsg.entities = clientMsg.entities.map((entity) => {
			const entityType: MessageEntityType =
				entity instanceof Api.MessageEntityBold
					? "bold"
					: entity instanceof Api.MessageEntityItalic
					  ? "italic"
					  : entity instanceof Api.MessageEntityCode
					    ? "code"
					    : entity instanceof Api.MessageEntityPre
					      ? "pre"
					      : entity instanceof Api.MessageEntityTextUrl
					        ? "text_link"
					        : entity instanceof Api.MessageEntityUnderline
					          ? "underline"
					          : "bold";
			const messageEntity: MessageEntity = {
				type: entityType,
				offset: entity.offset,
				length: entity.length,
			};
			return messageEntity;
		});
	}

	// For forum-related fields, these might not be directly mappable.
	// Placeholder, may require more API calls
	botMsg.forum_topic_created = undefined;
	botMsg.forum_topic_edited = undefined;

	// More complex mappings
	// _TODO finish convert of all missing fields
	// botMsg.from = clientMsg.fromId ? { id: parseInt(clientMsg.fromId.toString(), 10) } : undefined;
	// botMsg.document = clientMsg.document ? { file_id: clientMsg.document.id.toString() } : undefined;
	// botMsg.reply_to_message = clientMsg.replyTo ? convertClientMsgToBotMsg(clientMsg.replyTo) : undefined;
	botMsg.forward_date = clientMsg.date; // Assuming the date is the forward_date in gramJS

	// Forwarding fields, placeholders, might require more API calls
	botMsg.forward_from = undefined;
	botMsg.forward_from_chat = undefined;
	botMsg.forward_from_message_id = undefined;
	botMsg.forward_sender_name = clientMsg.postAuthor;
	botMsg.forward_signature = undefined;
	botMsg.media_group_id = clientMsg.groupedId?.toString();
	botMsg.message_thread_id = undefined; // Not directly mappable

	return botMsg;
}
