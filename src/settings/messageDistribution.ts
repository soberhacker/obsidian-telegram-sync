export enum ConditionType {
	ALL = "all",
	USER = "user",
	CHAT = "chat",
	TOPIC = "topic",
	FORWARD_FROM = "forwardFrom",
	CONTENT = "content",
	VOICE_TRANSCRIPT = "voiceTranscript",
}

export enum ConditionOperation {
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
	};
}

export function createBlankMessageDistributionRule(): MessageDistributionRule {
	return {
		messageFilterQuery: "",
		messageFilterConditions: [],
		templateFilePath: "",
		notePathTemplate: "",
		filePathTemplate: "",
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

export function getMessageDistributionRuleDisplayedName(distributionRule: MessageDistributionRule): string {
	if (!distributionRule.messageFilterConditions || distributionRule.messageFilterConditions.length == 0)
		return "• error: wrong filter query!";
	let displayedName = "";
	for (const condition of distributionRule.messageFilterConditions) {
		if (condition.conditionType == ConditionType.ALL) return "• all messages";
		displayedName = displayedName + `${condition.conditionType} ${condition.operation} ${condition.value}; `;
	}
	return "• " + (displayedName.length > 50 ? displayedName.slice(0, 50) + "..." : displayedName);
}
