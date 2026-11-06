import test from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import type TelegramBot from "node-telegram-bot-api";
import type TelegramSyncPlugin from "../src/main";
import type { RichMessage } from "../src/telegram/bot/message/richMessageTypes";
import { handleMessage } from "../src/telegram/bot/message/handlers";
import { resetServices, state } from "./support/services";

function makeMessage(rich: RichMessage): TelegramBot.Message {
	return {
		message_id: 42,
		date: 1700000000,
		from: { id: 100, is_bot: false, first_name: "Example", username: "example" },
		chat: { id: 100, type: "private" },
		rich_message: rich,
	};
}
function makePlugin(options: { allowed?: boolean; fail?: boolean; truncate?: boolean; failNote?: boolean } = {}) {
	const calls = {
		downloads: [] as string[],
		files: [] as { path: string; bytes: number }[],
		notes: [] as { path: string; content: string }[],
		reactions: 0,
		denied: 0,
	};
	const plugin = {
		settings: {
			allowedChats: options.allowed === false ? [] : ["example"],
			pluginVersion: "4.0.0",
			parallelMessageProcessing: false,
			messageDistributionRules: [
				{
					notePathTemplate: "Inbox/post.md",
					filePathTemplate: "Inbox/{{file:type}}s/{{file:name}}.{{file:extension}}",
					templateFilePath: "",
					heading: "",
					reversedOrder: false,
				},
			],
			defaultMessageDelimiter: false,
		},
		userConnected: true,
		isBotConnected: () => true,
		messagesLeftCnt: 0,
		createdFilePaths: [],
		bot: {
			getFileStream: (id: string) => {
				calls.downloads.push(id);
				return Readable.from(
					(async function* () {
						if (options.fail) throw new Error("download failed");
						yield Buffer.alloc(options.truncate ? 1 : 4);
					})(),
				);
			},
			sendMessage: async () => {
				calls.denied++;
			},
			setMessageReaction: async () => {
				calls.reactions++;
			},
		},
		app: {
			vault: {
				createBinary: async (path: string, data: ArrayBuffer) => {
					calls.files.push({ path, bytes: data.byteLength });
					return { path };
				},
				create: async (path: string, content: string) => {
					if (options.failNote) throw new Error("note write failed");
					calls.notes.push({ path, content });
				},
			},
			fileManager: { generateMarkdownLink: (file: { path: string }) => `[[${file.path}]]` },
		},
	};
	return { plugin: plugin as unknown as TelegramSyncPlugin, calls };
}
const richFixture = (): RichMessage => ({
	blocks: [
		{ type: "paragraph", text: { type: "bold", text: "Before" } },
		{
			type: "photo",
			photo: [
				{ file_id: "small", file_unique_id: "small", width: 1, height: 1, file_size: 1 },
				{ file_id: "large", file_unique_id: "large", width: 2, height: 2, file_size: 4 },
			],
			caption: { text: "First caption" },
		},
		{ type: "paragraph", text: "Between" },
		{ type: "photo", photo: [{ file_id: "second", file_unique_id: "second", width: 2, height: 2, file_size: 4 }] },
		{ type: "paragraph", text: "After" },
	],
});

test("imports a rich-only update, chooses largest photos and confirms only after note creation", async () => {
	resetServices();
	const { plugin, calls } = makePlugin(),
		message = makeMessage(richFixture());
	const before = JSON.stringify(message);
	await handleMessage(plugin, message);
	assert.deepEqual(calls.downloads, ["large", "second"]);
	assert.equal(calls.files.length, 2);
	assert.equal(calls.notes.length, 1);
	assert.equal(calls.reactions, 1);
	assert.equal(state.errors.length, 0);
	assert.match(
		calls.notes[0].content,
		/\*\*Before\*\*[\s\S]*!\[\[Inbox\/photos\/photo_100_42_1.jpg\]\][\s\S]*First caption[\s\S]*Between[\s\S]*photo_100_42_2.jpg[\s\S]*After/,
	);
	assert.equal(state.templateFiles[0].length, 2);
	assert(!calls.notes[0].content.includes("\u0000"));
	assert.equal(JSON.stringify(message), before);
});
test("performs access control before any rich attachment download", async () => {
	resetServices();
	const { plugin, calls } = makePlugin({ allowed: false });
	await handleMessage(plugin, makeMessage(richFixture()));
	assert.equal(calls.denied, 1);
	assert.equal(calls.downloads.length, 0);
	assert.equal(calls.notes.length, 0);
	assert.equal(calls.reactions, 0);
});
for (const options of [{ fail: true }, { truncate: true }, { failNote: true }])
	test(`never sends processed confirmation on failure: ${JSON.stringify(options)}`, async () => {
		resetServices();
		const { plugin, calls } = makePlugin(options);
		await handleMessage(plugin, makeMessage(richFixture()));
		assert.equal(calls.reactions, 0);
		assert.equal(calls.notes.length, 0);
		assert.equal(state.errors.length, 1);
		assert.equal(plugin.messagesLeftCnt, 0);
	});
test("imports text-only rich messages without requiring a file template", async () => {
	resetServices();
	const { plugin, calls } = makePlugin();
	plugin.settings.messageDistributionRules[0].filePathTemplate = "";
	await handleMessage(plugin, makeMessage({ blocks: [{ type: "paragraph", text: "Text only" }] }));
	assert.equal(calls.notes[0].content, "Text only");
	assert.equal(calls.downloads.length, 0);
	assert.equal(calls.reactions, 1);
});
test("rejects media without a file template before download or acknowledgement", async () => {
	resetServices();
	const { plugin, calls } = makePlugin();
	plugin.settings.messageDistributionRules[0].filePathTemplate = "";
	await handleMessage(plugin, makeMessage(richFixture()));
	assert.equal(calls.downloads.length, 0);
	assert.equal(calls.reactions, 0);
	assert.equal(state.errors.length, 1);
});
test("does not reinterpret rich post text as bot commands", async () => {
	resetServices();
	const { plugin, calls } = makePlugin();
	await handleMessage(plugin, makeMessage({ blocks: [{ type: "paragraph", text: "/start" }] }));
	await handleMessage(plugin, makeMessage({ blocks: [{ type: "paragraph", text: "Example /topicName text" }] }));
	assert.equal(calls.notes.length, 2);
});
test("preserves literal replacement characters in document filenames", async () => {
	resetServices();
	const { plugin, calls } = makePlugin();
	await handleMessage(
		plugin,
		makeMessage({
			blocks: [
				{
					type: "document",
					document: { file_id: "doc", file_unique_id: "doc", file_name: "example$&.txt", file_size: 4 },
				},
			],
		}),
	);
	assert.equal(calls.notes[0].content, "[[Inbox/documents/example$&.txt]]");
	assert.equal(calls.reactions, 1);
});
test("leaves the legacy text update path unchanged", async () => {
	resetServices();
	const { plugin, calls } = makePlugin(),
		msg = makeMessage({ blocks: [] });
	delete msg.rich_message;
	msg.text = "Legacy text";
	await handleMessage(plugin, msg);
	assert.equal(calls.notes[0].content, "Legacy text");
	assert.equal(calls.downloads.length, 0);
	assert.equal(calls.reactions, 1);
});

test("never acknowledges unknown blocks after routing their text", async () => {
	resetServices();
	const { plugin, calls } = makePlugin();
	await handleMessage(
		plugin,
		makeMessage({ blocks: [{ type: "future", text: "New block" } as unknown as RichMessage["blocks"][number]] }),
	);
	assert.equal(calls.reactions, 0);
	assert.equal(calls.notes.length, 0);
	assert.equal(state.errors.length, 1);
});
