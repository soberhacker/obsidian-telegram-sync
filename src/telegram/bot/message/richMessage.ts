import type {
	RichBlock,
	RichBlockCaption,
	RichMediaBlock,
	RichMessage,
	RichMessageButton,
	RichText,
} from "./richMessageTypes";

export interface RichMessageMedia {
	marker: string;
	block: RichMediaBlock;
}
export interface RenderedRichMessage {
	markdown: string;
	media: RichMessageMedia[];
}

function escapeText(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/[\\`*_[\]]/g, "\\$&");
}
function link(label: string, url: string): string {
	return `[${label}](<${url.replace(/[<>\r\n]/g, encodeURIComponent)}>)`;
}
function fence(text: string, minimum: number): string {
	return "`".repeat(Math.max(minimum, ...(text.match(/`+/g) || []).map((value) => value.length + 1)));
}
function unsupported(kind: string, value: unknown): never {
	throw new Error(`Unsupported Telegram rich ${kind}: ${(value as { type: string }).type}`);
}
function anchor(name: string): string {
	return `<a id="${escapeText(name).replace(/"/g, "&quot;")}"></a>`;
}
function buttonText(button: RichMessageButton, markdown: boolean): string {
	const text = renderRichText(button.text, markdown);
	const url = button.url || button.web_app?.url || button.login_url?.url;
	return markdown && url ? link(text, url) : text;
}

export function renderRichText(value: RichText, markdown = true): string {
	if (typeof value === "string") return markdown ? escapeText(value) : value;
	if (Array.isArray(value)) return value.map((part) => renderRichText(part, markdown)).join("");
	const text = "text" in value ? renderRichText(value.text, markdown) : "";
	if (!markdown) {
		switch (value.type) {
			case "custom_emoji":
				return value.alternative_text;
			case "mathematical_expression":
				return value.expression;
			case "button":
				return buttonText(value.button, false);
			default:
				return text;
		}
	}
	const plain = () => ("text" in value ? renderRichText(value.text, false) : "");
	switch (value.type) {
		case "bold":
			return `**${text}**`;
		case "italic":
			return `*${text}*`;
		case "underline":
			return `<u>${text}</u>`;
		case "strikethrough":
			return `~~${text}~~`;
		case "spoiler":
			return `<span class="tg-spoiler">${text}</span>`;
		case "subscript":
			return `<sub>${text}</sub>`;
		case "superscript":
			return `<sup>${text}</sup>`;
		case "marked":
			return `==${text}==`;
		case "code": {
			const raw = plain();
			const delimiter = fence(raw, 1);
			return `${delimiter} ${raw} ${delimiter}`;
		}
		case "url":
			return link(text, value.url);
		case "email_address":
			return link(text, "mailto:" + value.email_address);
		case "phone_number":
			return link(text, "tel:" + value.phone_number);
		case "text_mention":
			return link(text, "tg://user?id=" + value.user.id);
		case "custom_emoji":
			return escapeText(value.alternative_text);
		case "mathematical_expression":
			return "$" + value.expression + "$";
		case "anchor":
			return anchor(value.name);
		case "anchor_link":
			return link(text, "#" + encodeURIComponent(value.anchor_name));
		case "reference":
			return anchor(value.name) + text;
		case "reference_link":
			return link(text, "#" + encodeURIComponent(value.reference_name));
		case "button":
			return buttonText(value.button, true);
		case "date_time":
		case "bank_card_number":
		case "mention":
		case "hashtag":
		case "cashtag":
		case "bot_command":
			return text;
		default:
			return unsupported("text", value);
	}
}

function renderBlocks(blocks: RichBlock[], onMedia: (block: RichMediaBlock) => string, markdown: boolean): string {
	const text = (value?: RichText) => (value === undefined ? "" : renderRichText(value, markdown));
	const render = (children: RichBlock[]) => renderBlocks(children, onMedia, markdown);
	const caption = (value?: RichBlockCaption) =>
		value ? [text(value.text), text(value.credit)].filter(Boolean).join("\n") : "";
	return blocks
		.map((block) => {
			switch (block.type) {
				case "paragraph":
				case "footer":
					return text(block.text);
				case "heading":
					return (markdown ? "#".repeat(Math.min(6, Math.max(1, block.size))) + " " : "") + text(block.text);
				case "divider":
					return markdown ? "---" : "";
				case "anchor":
					return markdown ? anchor(block.name) : "";
				case "pre": {
					const raw = renderRichText(block.text, false);
					const delimiter = fence(raw, 3);
					return markdown
						? `${delimiter}${(block.language || "").replace(/[^\w+-]/g, "")}\n${raw}\n${delimiter}`
						: raw;
				}
				case "mathematical_expression":
					return markdown ? `$$\n${block.expression}\n$$` : block.expression;
				case "blockquote":
				case "expandable_blockquote":
				case "pullquote": {
					const content = ["blocks" in block ? render(block.blocks) : text(block.text), text(block.credit)]
						.filter(Boolean)
						.join("\n\n");
					return markdown
						? content
								.split("\n")
								.map((line) => "> " + line)
								.join("\n")
						: content;
				}
				case "list":
					return block.items
						.map((item) => {
							const label = item.has_checkbox
								? item.is_checked
									? "- [x]"
									: "- [ ]"
								: item.value !== undefined
								  ? `${item.value}.`
								  : "-";
							return (markdown ? label + " " : "") + render(item.blocks).replace(/\n/g, "\n  ");
						})
						.join("\n");
				case "details":
					return [text(block.summary), render(block.blocks)].filter(Boolean).join("\n\n");
				case "collage":
				case "slideshow":
					return [render(block.blocks), caption(block.caption)].filter(Boolean).join("\n\n");
				case "table": {
					const rows = block.cells.map((row) =>
						row.map((cell) => text(cell.text).replace(/\|/g, "\\|").replace(/\n/g, "<br>")),
					);
					if (!rows.length) return text(block.caption);
					const table = markdown
						? [rows[0], rows[0].map(() => "---"), ...rows.slice(1)]
								.map((row) => "| " + row.join(" | ") + " |")
								.join("\n")
						: rows.map((row) => row.join("\t")).join("\n");
					return [text(block.caption), table].filter(Boolean).join("\n\n");
				}
				case "buttons":
					return block.buttons.map((button) => buttonText(button, markdown)).join(" · ");
				case "photo":
				case "video":
				case "audio":
				case "animation":
				case "voice_note":
				case "document":
					return [markdown ? onMedia(block) : "", caption(block.caption)].filter(Boolean).join("\n\n");
				default:
					// A future block can still be routed by text without acknowledging an
					// incomplete import: the strict Markdown pass below will reject it.
					if (!markdown) return "text" in block ? text((block as { text: RichText }).text) : "";
					return unsupported("block", block);
			}
		})
		.filter((value) => value.trim())
		.join("\n\n");
}

export function richMessageToText(message: RichMessage): string {
	return renderBlocks(message.blocks, () => "", false);
}

export function renderRichMessage(message: RichMessage): RenderedRichMessage {
	const media: RichMessageMedia[] = [];
	const markdown = renderBlocks(
		message.blocks,
		(block) => {
			const marker = `\u0000telegram-rich-media-${media.length}\u0000`;
			media.push({ marker, block });
			return marker;
		},
		true,
	);
	return { markdown, media };
}
