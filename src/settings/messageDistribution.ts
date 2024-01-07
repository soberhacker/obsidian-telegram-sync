export enum ConditionType {
	ALL = "all",
	USER = "user",
	CHAT = "chat",
	TOPIC = "topic",
	FORWARD_FROM = "forwardFrom",
	CONTENT = "content",
	VOICE_TRANSCRIPT = "voiceTranscript",
}

enum ConditionOperation {
	EQUAL = "=",
	NOT_EQUAL = "!=",
	CONTAIN = "~",
	NOT_CONTAIN = "!~",
	NO_OPERATION = "",
}

export interface MessageFilterCondition {
	conditionType: ConditionType;
	operation: ConditionOperation;
	value: string;
}

export interface MessageDistributionRuleInfo {
	name: string;
	description: string;
}

export const defaultMessageFilterQuery = `{{${ConditionType.ALL}}}`;

export function createDefaultMessageFilterCondition(): MessageFilterCondition {
	return {
		conditionType: ConditionType.ALL,
		operation: ConditionOperation.NO_OPERATION,
		value: "",
	};
}

export interface MessageDistributionRule {
	messageFilterQuery: string;
	messageFilterConditions: MessageFilterCondition[];
	templateFilePath: string;
	notePathTemplate: string;
	filePathTemplate: string;
	reversedOrder: boolean;
}

export const defaultTelegramFolder = "Telegram";
export const defaultNoteNameTemplate = "{{content:30}} - {{messageTime:YYYYMMDDHHmmssSSS}}.md";
export const defaultFileNameTemplate = "{{file:name}} - {{messageTime:YYYYMMDDHHmmssSSS}}.{{file:extension}}";

export function createDefaultMessageDistributionRule(): MessageDistributionRule {
	return {
		messageFilterQuery: defaultMessageFilterQuery,
		messageFilterConditions: [createDefaultMessageFilterCondition()],
		templateFilePath: "",
		notePathTemplate: `${defaultTelegramFolder}/${defaultNoteNameTemplate}`,
		filePathTemplate: `${defaultTelegramFolder}/{{file:type}}s/${defaultFileNameTemplate}`,
		reversedOrder: false,
	};
}

export function createBlankMessageDistributionRule(): MessageDistributionRule {
	return {
		messageFilterQuery: "",
		messageFilterConditions: [],
		templateFilePath: "",
		notePathTemplate: "",
		filePathTemplate: "",
		reversedOrder: false,
	};
}

export function extractConditionsFromFilterQuery(messageFilterQuery: string): MessageFilterCondition[] {
	if (!messageFilterQuery || messageFilterQuery == `{{${ConditionType.ALL}}}`)
		return [
			{
				conditionType: ConditionType.ALL,
				operation: ConditionOperation.NO_OPERATION,
				value: "",
			},
		];
	const filterQueryPattern = /\{{([^{}=!~]+)(=|!=|~|!~)([^{}]+)\}}/g;
	const matches = [...messageFilterQuery.matchAll(filterQueryPattern)];

	// Check for unbalanced braces
	const openBracesCount = (messageFilterQuery.match(/\{{/g) || []).length;
	const closeBracesCount = (messageFilterQuery.match(/\}}/g) || []).length;
	if (openBracesCount !== closeBracesCount) {
		throw new Error("Unbalanced braces in filter query.");
	}

	return matches.map((match) => {
		const [, conditionType, operation, value] = match;

		if (!value) {
			throw new Error(`Empty value for condition type: ${conditionType}`);
		}

		if (!Object.values(ConditionType).includes(conditionType as ConditionType)) {
			throw new Error(`Unknown condition type: ${conditionType}`);
		}

		if (!Object.values(ConditionOperation).includes(operation as ConditionOperation)) {
			throw new Error(`Unsupported filter operation: ${operation}`);
		}

		return {
			conditionType: conditionType as ConditionType,
			operation: operation as ConditionOperation,
			value: value,
		};
	});
}

export function getMessageDistributionRuleInfo(distributionRule: MessageDistributionRule): MessageDistributionRuleInfo {
	const messageDistributionRuleInfo: MessageDistributionRuleInfo = { name: "", description: "" };
	if (distributionRule.notePathTemplate)
		messageDistributionRuleInfo.description = `Note path: ${distributionRule.notePathTemplate}`;
	else if (distributionRule.templateFilePath)
		messageDistributionRuleInfo.description = `Template file: ${distributionRule.templateFilePath}`;
	else if (distributionRule.filePathTemplate)
		messageDistributionRuleInfo.description = `File path: ${distributionRule.filePathTemplate}`;
	if (!distributionRule.messageFilterConditions || distributionRule.messageFilterConditions.length == 0) {
		messageDistributionRuleInfo.name = "error: wrong filter query!";
		return messageDistributionRuleInfo;
	}

	for (const condition of distributionRule.messageFilterConditions) {
		if (condition.conditionType == ConditionType.ALL) {
			messageDistributionRuleInfo.name = `filter = "all messages"`;
			return messageDistributionRuleInfo;
		}
		messageDistributionRuleInfo.name =
			messageDistributionRuleInfo.name +
			`${condition.conditionType} ${condition.operation} "${condition.value}" & `;
	}
	if (messageDistributionRuleInfo.name.length > 50)
		messageDistributionRuleInfo.name = messageDistributionRuleInfo.name.slice(0, 50) + "...";
	else messageDistributionRuleInfo.name = messageDistributionRuleInfo.name.replace(/ & $/, "");
	return messageDistributionRuleInfo;
}
