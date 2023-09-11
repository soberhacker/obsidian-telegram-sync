export enum MessageFilterType {
	ALL = "all",
	USER = "user",
	CHAT = "chat",
	TOPIC = "topic",
	FORWARD_FROM = "forwardFrom",
}

export enum MessageFilterOperation {
	EQUAL = "=",
	NOT_EQUAL = "!=",
	CONTAIN = "~",
	NOT_CONTAIN = "!~",
	NO_OPERATION = "",
}

export interface MessageFilter {
	filterType: MessageFilterType;
	operation: MessageFilterOperation;
	value: string;
}

export const defaultMessageFilterQuery = `{{${MessageFilterType.ALL}}}`;

export const defaultMessageFilter = {
	filterType: MessageFilterType.ALL,
	operation: MessageFilterOperation.NO_OPERATION,
	value: "",
};

// TODO now: Replace with new names
export interface MessageDistributionRule {
	messageFilterQuery: string;
	messageFilters: MessageFilter[];
	path2Template: string; // templateFilePath
	path2Note: string; // notePathTemplate
	path2Files: string; // filePathTemplate
}

export const defaultTelegramFolder = "Telegram";
export const defaultNoteNameTemplate = "{{content:30}} - {{messageTime:YYYYMMDDHHmmssSSS}}.md";
export const defaultFileNameTemplate = "{{file:name}} - {{messageTime:YYYYMMDDHHmmssSSS}}.{{file:extension}}";

export const defaultMessageDistributionRule: MessageDistributionRule = {
	messageFilterQuery: defaultMessageFilterQuery,
	messageFilters: [defaultMessageFilter],
	path2Template: "",
	path2Note: `${defaultTelegramFolder}/${defaultNoteNameTemplate}`,
	path2Files: `${defaultTelegramFolder}/{{file:type}}s/${defaultFileNameTemplate}`,
};

export function extractMessageFiltersFromQuery(messageFilterQuery: string): MessageFilter[] {
	if (!messageFilterQuery || messageFilterQuery == `{{${MessageFilterType.ALL}}}`)
		return [
			{
				filterType: MessageFilterType.ALL,
				operation: MessageFilterOperation.NO_OPERATION,
				value: "",
			},
		];
	const filterPattern = /\{{([^{}=!~]+)(=|!=|~|!~)([^{}]+)\}}/g;
	const matches = [...messageFilterQuery.matchAll(filterPattern)];

	// Check for unbalanced braces
	const openBracesCount = (messageFilterQuery.match(/\{{/g) || []).length;
	const closeBracesCount = (messageFilterQuery.match(/\}}/g) || []).length;
	if (openBracesCount !== closeBracesCount) {
		throw new Error("Unbalanced braces in filter query.");
	}

	return matches.map((match) => {
		const [, filterType, operation, value] = match;

		if (!value) {
			throw new Error(`Empty value for filter type: ${filterType}`);
		}

		if (!Object.values(MessageFilterType).includes(filterType as MessageFilterType)) {
			throw new Error(`Unknown filter type: ${filterType}`);
		}

		if (!Object.values(MessageFilterOperation).includes(operation as MessageFilterOperation)) {
			throw new Error(`Unsupported filter operation: ${operation}`);
		}

		return {
			filterType: filterType as MessageFilterType,
			operation: operation as MessageFilterOperation,
			value: value,
		};
	});
}
