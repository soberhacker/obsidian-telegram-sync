import type TelegramBot from "node-telegram-bot-api";

// https://core.telegram.org/bots/api#richmessage (Bot API 10.1–10.3)
type TextStyle =
	| "bold"
	| "italic"
	| "underline"
	| "strikethrough"
	| "spoiler"
	| "date_time"
	| "subscript"
	| "superscript"
	| "marked"
	| "code";
export type RichText =
	| string
	| RichText[]
	| { type: TextStyle; text: RichText }
	| { type: "url"; text: RichText; url: string }
	| { type: "email_address"; text: RichText; email_address: string }
	| { type: "phone_number"; text: RichText; phone_number: string }
	| { type: "bank_card_number"; text: RichText; bank_card_number: string }
	| { type: "mention"; text: RichText; username: string }
	| { type: "hashtag"; text: RichText; hashtag: string }
	| { type: "cashtag"; text: RichText; cashtag: string }
	| { type: "bot_command"; text: RichText; bot_command: string }
	| { type: "text_mention"; text: RichText; user: TelegramBot.User }
	| { type: "custom_emoji"; alternative_text: string; custom_emoji_id: string }
	| { type: "mathematical_expression"; expression: string }
	| { type: "anchor"; name: string }
	| { type: "anchor_link"; text: RichText; anchor_name: string }
	| { type: "reference"; text: RichText; name: string }
	| { type: "reference_link"; text: RichText; reference_name: string }
	| { type: "button"; button: RichMessageButton };

export interface RichMessageButton {
	text: RichText;
	url?: string;
	web_app?: { url: string };
	login_url?: { url: string };
}
export interface RichBlockCaption {
	text: RichText;
	credit?: RichText;
}
export interface RichBlockListItem {
	label: string;
	blocks: RichBlock[];
	has_checkbox?: boolean;
	is_checked?: boolean;
	value?: number;
	type?: string;
}
export interface RichBlockTableCell {
	text?: RichText;
	is_header?: boolean;
	colspan?: number;
	rowspan?: number;
	align?: string;
	valign?: string;
}

export type RichMediaBlock = (
	| { type: "photo"; photo: TelegramBot.PhotoSize[] }
	| { type: "video"; video: TelegramBot.Video }
	| { type: "animation"; animation: TelegramBot.Animation }
	| { type: "audio"; audio: TelegramBot.Audio }
	| { type: "voice_note"; voice_note: TelegramBot.Voice }
	| { type: "document"; document: TelegramBot.Document }
) & { caption?: RichBlockCaption };

export type RichBlock =
	| { type: "paragraph" | "footer"; text: RichText }
	| { type: "heading"; text: RichText; size: number }
	| { type: "pre"; text: RichText; language?: string }
	| { type: "divider" }
	| { type: "mathematical_expression"; expression: string }
	| { type: "anchor"; name: string }
	| { type: "list"; items: RichBlockListItem[] }
	| { type: "blockquote"; blocks: RichBlock[]; credit?: RichText }
	| { type: "expandable_blockquote" | "pullquote"; text: RichText; credit?: RichText }
	| { type: "collage" | "slideshow"; blocks: RichBlock[]; caption?: RichBlockCaption }
	| { type: "details"; summary: RichText; blocks: RichBlock[]; is_open?: boolean }
	| { type: "table"; cells: RichBlockTableCell[][]; caption?: RichText }
	| { type: "buttons"; buttons: RichMessageButton[] }
	| RichMediaBlock;

export interface RichMessage {
	blocks: RichBlock[];
	is_rtl?: boolean;
}
