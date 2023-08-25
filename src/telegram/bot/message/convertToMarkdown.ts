import TelegramBot from "node-telegram-bot-api";
import { getInlineUrls } from "./getters";

export async function convertMessageTextToMarkdown(msg: TelegramBot.Message): Promise<string> {
	let text = msg.text || msg.caption || "";
	const entities = msg.entities || msg.caption_entities || [];
	entities.forEach((entity, index, updatedEntities) => {
		const entityStart = entity.offset;
		let entityEnd = entityStart + entity.length;
		let entityText = text.slice(entityStart, entityEnd);
		// skip trailing new lines
		if (entity.type != "pre") entityEnd = entityEnd - entityText.length + entityText.trimEnd().length;

		const beforeEntity = text.slice(0, entityStart);
		entityText = text.slice(entityStart, entityEnd);
		const afterEntity = text.slice(entityEnd);

		switch (entity.type) {
			case "bold":
				entityText = `**${entityText}**`;
				updateEntitiesOffset(updatedEntities, entity, index, 2, 2);
				break;
			case "italic":
				entityText = `*${entityText}*`;
				updateEntitiesOffset(updatedEntities, entity, index, 1, 1);
				break;
			case "underline":
				entityText = `<u>${entityText}</u>`;
				updateEntitiesOffset(updatedEntities, entity, index, 3, 4);
				break;
			case "strikethrough":
				entityText = `~~${entityText}~~`;
				updateEntitiesOffset(updatedEntities, entity, index, 2, 2);
				break;
			case "code":
				entityText = "`" + entityText + "`";
				updateEntitiesOffset(updatedEntities, entity, index, 1, 1);
				break;
			case "pre":
				entityText = "```\n" + entityText + "\n```";
				updateEntitiesOffset(updatedEntities, entity, index, 4, 4);
				break;
			case "text_link":
				if (entity.url) {
					entityText = `[${entityText}](${entity.url})`;
					updateEntitiesOffset(updatedEntities, entity, index, 1, entity.url.length + 3);
				}
				break;
			default:
				break;
		}
		text = beforeEntity + entityText + afterEntity;
	});
	const inlineUrls = getInlineUrls(msg);
	return text + (inlineUrls ? `\n\n${inlineUrls}` : "");
}

function updateEntitiesOffset(
	currentEntities: TelegramBot.MessageEntity[],
	currentEntity: TelegramBot.MessageEntity,
	currentIndex: number,
	beforeOffset: number,
	afterOffset: number,
) {
	currentEntities.forEach((entity, index) => {
		if (index <= currentIndex) return;
		if (entity.offset >= currentEntity.offset) entity.offset += beforeOffset;
		if (entity.offset > currentEntity.offset + currentEntity.length) entity.offset += afterOffset;
	});
}

export function escapeRegExp(str: string) {
	return str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}
