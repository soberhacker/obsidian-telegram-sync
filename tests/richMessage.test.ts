import test from "node:test";
import assert from "node:assert/strict";
import { renderRichMessage, renderRichText, richMessageToText } from "../src/telegram/bot/message/richMessage";
import type { RichBlock, RichMessage, RichText } from "../src/telegram/bot/message/richMessageTypes";
import { convertMessageTextToMarkdown } from "../src/telegram/bot/message/convertToMarkdown";
import type TelegramBot from "node-telegram-bot-api";

test("renders nested Unicode formatting and links without changing the input", () => {
	const input: RichText = [
		"α ",
		{ type: "bold", text: ["β", { type: "italic", text: "γ" }] },
		{ type: "url", text: " documentation", url: "https://example.org/a(b)" },
	];
	const before = JSON.stringify(input);
	assert.equal(renderRichText(input), "α **β*γ***[ documentation](<https://example.org/a(b)>)");
	assert.equal(renderRichText(input, false), "α βγ documentation");
	assert.equal(JSON.stringify(input), before);
});
test("escapes literal Markdown and HTML, and chooses safe code fences", () => {
	assert.equal(renderRichText("<script> **text** [link]"), "&lt;script&gt; \\*\\*text\\*\\* \\[link\\]");
	assert.equal(renderRichText({ type: "code", text: "a`b" }), "`` a`b ``");
	assert.equal(
		renderRichMessage({ blocks: [{ type: "pre", text: "```", language: "js" }] }).markdown,
		"````js\n```\n````",
	);
});
test("preserves paragraph, quotation, heading, list and caption order", () => {
	const message: RichMessage = {
		blocks: [
			{ type: "heading", size: 2, text: "Title" },
			{ type: "paragraph", text: "Before" },
			{ type: "blockquote", blocks: [{ type: "paragraph", text: "Quote" }] },
			{
				type: "list",
				items: [
					{ label: "", has_checkbox: true, is_checked: true, blocks: [{ type: "paragraph", text: "Done" }] },
				],
			},
			{
				type: "photo",
				photo: [{ file_id: "synthetic-photo", file_unique_id: "synthetic", width: 10, height: 10 }],
				caption: { text: "Caption", credit: "Credit" },
			},
			{ type: "paragraph", text: "After" },
		],
	};
	const result = renderRichMessage(message);
	assert.equal(result.media.length, 1);
	assert.equal(
		result.markdown,
		`## Title\n\nBefore\n\n> Quote\n\n- [x] Done\n\n${result.media[0].marker}\n\nCaption\nCredit\n\nAfter`,
	);
	assert.equal(richMessageToText(message), "Title\n\nBefore\n\nQuote\n\nDone\n\nCaption\nCredit\n\nAfter");
});
test("collects nested media in document order", () => {
	const photo = (id: string): RichBlock => ({
		type: "photo",
		photo: [{ file_id: id, file_unique_id: id, width: 1, height: 1 }],
	});
	const result = renderRichMessage({
		blocks: [
			{ type: "details", summary: "More", blocks: [photo("first")] },
			{ type: "collage", blocks: [photo("second"), photo("third")] },
		],
	});
	assert.equal(result.media.length, 3);
	assert.deepEqual(
		result.media.map((item) => (item.block.type === "photo" ? item.block.photo[0].file_id : "")),
		["first", "second", "third"],
	);
});
test("retains anchors and links rather than creating dangling references", () => {
	const rich: RichMessage = {
		blocks: [
			{ type: "anchor", name: "example" },
			{ type: "paragraph", text: { type: "anchor_link", text: "Go", anchor_name: "example" } },
		],
	};
	assert.equal(renderRichMessage(rich).markdown, '<a id="example"></a>\n\n[Go](<#example>)');
});
test("rejects unknown blocks and text instead of acknowledging incomplete captures", () => {
	assert.throws(
		() => renderRichMessage({ blocks: [{ type: "future", text: "new" } as unknown as RichBlock] }),
		/Unsupported Telegram rich block/,
	);
	assert.throws(
		() => renderRichText({ type: "future", text: "new" } as unknown as RichText),
		/Unsupported Telegram rich text/,
	);
	assert.equal(richMessageToText({ blocks: [{ type: "future", text: "new" } as unknown as RichBlock] }), "new");
});
test("keeps legacy entities and prepared rich Markdown on separate paths", async () => {
	const msg = { text: "Bold", entities: [{ type: "bold", offset: 0, length: 4 }] } as TelegramBot.Message;
	assert.equal(await convertMessageTextToMarkdown(msg), "**Bold**");
	assert.equal(await convertMessageTextToMarkdown(msg, "**Rich**"), "**Rich**");
	assert.deepEqual(msg.entities, [{ type: "bold", offset: 0, length: 4 }]);
});

test("renders the Bot API flat button row schema", () => {
	const result = renderRichMessage({
		blocks: [{ type: "buttons", buttons: [{ text: "Docs", url: "https://example.org" }, { text: "Copy" }] }],
	});
	assert.equal(result.markdown, "[Docs](<https://example.org>) · Copy");
});
