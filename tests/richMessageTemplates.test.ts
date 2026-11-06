import test from "node:test";
import assert from "node:assert/strict";
import type TelegramBot from "node-telegram-bot-api";
import type TelegramSyncPlugin from "../src/main";
import { applyNoteContentTemplate } from "../src/telegram/bot/message/processors";

const message: TelegramBot.Message = {
	message_id: 42,
	date: 1700000000,
	from: { id: 100, is_bot: false, first_name: "Example", username: "example" },
	chat: { id: 100, type: "private" },
	text: "Before After",
};
function plugin(template = ""): TelegramSyncPlugin {
	return {
		settings: { topicNames: [] },
		app: { vault: { getAbstractFileByPath: () => ({ path: "template.md" }), read: async () => template } },
	} as unknown as TelegramSyncPlugin;
}
test("default capture embeds rich media once in its original position", async () => {
	const result = await applyNoteContentTemplate(
		plugin(),
		"",
		message,
		["![[picture.jpg]]"],
		"Before\n\n![[picture.jpg]]\n\nAfter",
	);
	assert.equal((result.match(/picture.jpg/g) || []).length, 1);
	assert(result.endsWith("Before\n\n![[picture.jpg]]\n\nAfter"));
});
test("custom templates receive both rich content and explicit files variables", async () => {
	const result = await applyNoteContentTemplate(
		plugin("{{content}}\nFILES={{files}}\nLINKS={{files:links}}"),
		"template.md",
		message,
		["![[picture.jpg]]"],
		"Rich **body**",
	);
	assert(result.includes("Rich **body**"));
	assert(result.includes("FILES=![[picture.jpg]]"));
	assert(result.includes("LINKS=[[picture.jpg]]"));
	assert(!result.includes("{{"));
});
test("legacy default capture still prepends its attachment links", async () => {
	const result = await applyNoteContentTemplate(plugin(), "", message, ["![[picture.jpg]]"]);
	assert(result.endsWith("![[picture.jpg]]\n\nBefore After"));
});

test("files:links converts every rich attachment to a non-embedded link", async () => {
	const result = await applyNoteContentTemplate(
		plugin("{{files:links}}"),
		"template.md",
		message,
		["![[first.jpg]]", "![[second.jpg]]"],
		"Body",
	);
	assert.equal(result, "[[first.jpg]]\n[[second.jpg]]");
});
