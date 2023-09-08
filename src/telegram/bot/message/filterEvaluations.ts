import TelegramBot from "node-telegram-bot-api";
import { MessageDistributionRule, MessageFilter, MessageFilterType } from "src/settings/messageDistribution";
import { getForwardFromName, getTopic } from "./getters";
import TelegramSyncPlugin from "src/main";

export function isUserFiltered(msg: TelegramBot.Message, userNameOrId: string): boolean {
	if (!msg?.from || !userNameOrId) return false;

	const user = msg.from;
	const fullName = `${user.first_name} ${user.last_name || ""}`.trim();

	return [user.username, user.id.toString().slice(4), fullName].includes(userNameOrId);
}

export function isChatFiltered(msg: TelegramBot.Message, chatNameOrId: string): boolean {
	if (!msg?.chat || !chatNameOrId) return false;

	const chat = msg.chat;
	const chatId = chat.id.toString().slice(4);

	let chatName = "";
	if (chat.type == "private") {
		chatName = `${chat.first_name} ${chat.last_name || ""}`.trim();
	} else {
		chatName = chat.title || chatId;
	}

	return [chatId, chatName].includes(chatNameOrId);
}

export function isForwardFromFiltered(msg: TelegramBot.Message, forwardFromName: string): boolean {
	return forwardFromName == getForwardFromName(msg);
}

export async function isTopicFiltered(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	topicName: string,
): Promise<boolean> {
	const topic = await getTopic(plugin, msg, false);
	if (!topic) return false;
	return topicName == topic.name;
}

export async function isMessageFiltered(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	filter: MessageFilter,
): Promise<boolean> {
	switch (filter.filterType) {
		case MessageFilterType.ALL:
			return true;
		case MessageFilterType.USER:
			return isUserFiltered(msg, filter.value);
		case MessageFilterType.CHAT:
			return isChatFiltered(msg, filter.value);
		case MessageFilterType.FORWARD_FROM:
			return isForwardFromFiltered(msg, filter.value);
		case MessageFilterType.TOPIC:
			return await isTopicFiltered(plugin, msg, filter.value);
		default:
			return false;
	}
}

export function doesMessageMatchAllFilters(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	filters: MessageFilter[],
): boolean {
	return !!filters.find(async (filter) => await isMessageFiltered(plugin, msg, filter));
}

export function getMessageDistributionRule(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
): MessageDistributionRule | undefined {
	return plugin.settings.messageDistributionRules.find((rule) =>
		doesMessageMatchAllFilters(plugin, msg, rule.messageFilters),
	);
}
