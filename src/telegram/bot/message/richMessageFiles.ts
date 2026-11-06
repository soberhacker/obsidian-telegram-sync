import type TelegramBot from "node-telegram-bot-api";
import type TelegramSyncPlugin from "../../../main";
import type { MessageDistributionRule } from "src/settings/messageDistribution";
import type { RichMediaBlock } from "./richMessageTypes";
import { renderRichMessage } from "./richMessage";
import { applyFilesPathTemplate, applyNotePathTemplate } from "./processors";
import { createFolderIfNotExist, getUniqueFilePath } from "src/utils/fsUtils";
import { unixTime2Date } from "src/utils/dateUtils";
import { enqueue } from "src/utils/queues";
import { extension } from "mime-types";
import path from "path";

export interface PreparedRichMessage {
	markdown: string;
	filesLinks: string[];
}
interface RichFile extends TelegramBot.FileBase {
	file_name?: string;
	mime_type?: string;
}

function getRichFile(block: RichMediaBlock): RichFile {
	switch (block.type) {
		case "photo": {
			const largest = block.photo.reduce<TelegramBot.PhotoSize | undefined>((best, file) => {
				const size = file.file_size || file.width * file.height;
				const previous = best ? best.file_size || best.width * best.height : -1;
				return size > previous ? file : best;
			}, undefined);
			if (!largest) throw new Error("Telegram rich photo has no available sizes");
			return largest;
		}
		case "video":
			return block.video;
		case "animation":
			return block.animation;
		case "audio":
			return block.audio;
		case "voice_note":
			return block.voice_note;
		case "document":
			return block.document;
	}
}

export async function prepareRichMessage(
	plugin: TelegramSyncPlugin,
	msg: TelegramBot.Message,
	rule: MessageDistributionRule,
): Promise<PreparedRichMessage> {
	if (!msg.rich_message) throw new Error("Telegram rich message is missing");
	const rendered = renderRichMessage(msg.rich_message);
	if (rendered.media.length && !rule.filePathTemplate)
		throw new Error("A file path template is required to save rich message attachments");
	const notePath = await applyNotePathTemplate(plugin, rule.notePathTemplate, msg);
	const defaults: Record<string, string> = {
		photo: "jpg",
		video: "mp4",
		animation: "mp4",
		audio: "mp3",
		voice: "ogg",
		document: "bin",
	};
	const filesLinks: string[] = [];
	let markdown = rendered.markdown;
	for (let index = 0; index < rendered.media.length; index++) {
		const { marker, block } = rendered.media[index];
		const file = getRichFile(block);
		if (!file.file_id || !plugin.bot) throw new Error("Telegram rich message attachment is unavailable");
		const fileType = block.type === "voice_note" ? "voice" : block.type;
		const fileExtension =
			path.extname(file.file_name || "").slice(1) || extension(file.mime_type || "") || defaults[fileType];
		const fileName = file.file_name
			? path.basename(file.file_name, path.extname(file.file_name))
			: `${fileType}_${msg.chat.id}_${msg.message_id}_${index + 1}`;
		let filePath = await applyFilesPathTemplate(
			plugin,
			rule.filePathTemplate,
			msg,
			fileType,
			fileExtension,
			fileName,
		);
		filePath = await enqueue(
			getUniqueFilePath,
			plugin.app.vault,
			plugin.createdFilePaths,
			filePath,
			unixTime2Date(msg.date, msg.message_id),
			fileExtension,
		);
		const chunks: Buffer[] = [];
		for await (const chunk of plugin.bot.getFileStream(file.file_id)) chunks.push(Buffer.from(chunk));
		const data = Buffer.concat(chunks);
		if (!data.length || (file.file_size !== undefined && data.length !== file.file_size))
			throw new Error("Incomplete Telegram rich message attachment download");
		await createFolderIfNotExist(plugin.app.vault, path.dirname(filePath));
		const saved = await plugin.app.vault.createBinary(
			filePath,
			data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
		);
		const link = plugin.app.fileManager.generateMarkdownLink(saved, notePath);
		const embedded = fileType === "document" || link.startsWith("!") ? link : "!" + link;
		filesLinks.push(embedded);
		// A filename can contain $&; use a callback to avoid replacement expansion.
		markdown = markdown.replace(marker, () => embedded);
	}
	return { markdown, filesLinks };
}
