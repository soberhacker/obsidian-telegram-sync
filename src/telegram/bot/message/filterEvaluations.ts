import TelegramBot from "node-telegram-bot-api";
import { MessageDistributionRule, MessageFilterCondition, ConditionType } from "src/settings/messageDistribution";
import { getForwardFromName, getTopic } from "./getters";
import TelegramSyncPlugin from "src/main";
import * as Client from "src/telegram/user/client";

function isUserFiltered(msg: TelegramBot.Message, userNameOrId: string): boolean {
	if (!msg?.from || !userNameOrId) return false;

	const user = msg.from;
	const fullName = `${user.first_name} ${user.last_name || ""}`.trim();

	return [user.username, user.id.toString().slice(4), fullName].includes(userNameOrId);
}

function isChatFiltered(msg: TelegramBot.Message, chatNameOrId: string): boolean {
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

function isForwardFromFiltered(msg: TelegramBot.Message, forwardFromName: string): boolean {
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

export async function isContentFiltered(msg: TelegramBot.Message, substring: string): Promise<boolean> {
	return (msg.text || msg.caption || "").contains(substring);
}

export async function isVoiceTranscriptFiltered(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	substring: string,
): Promise<boolean> {
	let voiceTranscript = "";
	if (plugin.bot) voiceTranscript = await Client.transcribeAudio(plugin.bot, msg, await plugin.getBotUser());
	return voiceTranscript.contains(substring);
}

export async function isMessageFiltered(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	condition: MessageFilterCondition,
): Promise<boolean> {
	switch (condition.conditionType) {
		case ConditionType.ALL:
			return true;
		case ConditionType.USER:
			return isUserFiltered(msg, condition.value);
		case ConditionType.CHAT:
			return isChatFiltered(msg, condition.value);
		case ConditionType.FORWARD_FROM:
			return isForwardFromFiltered(msg, condition.value);
		case ConditionType.TOPIC:
			return await isTopicFiltered(plugin, msg, condition.value);
		case ConditionType.CONTENT:
			return await isContentFiltered(msg, condition.value);
		case ConditionType.VOICE_TRANSCRIPT:
			return await isVoiceTranscriptFiltered(plugin, msg, condition.value);
		default:
			return false;
	}
}

export async function doesMessageMatchRule(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	rule: MessageDistributionRule,
): Promise<boolean> {
	for (const condition of rule.messageFilterConditions) {
		const isFiltered = await isMessageFiltered(plugin, msg, condition);
		if (!isFiltered) return false;
	}
	return true;
}

export async function getMessageDistributionRule(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
): Promise<MessageDistributionRule | undefined> {
	for (const rule of plugin.settings.messageDistributionRules) {
		if (await doesMessageMatchRule(plugin, msg, rule)) return rule;
	}
	return undefined;
}
