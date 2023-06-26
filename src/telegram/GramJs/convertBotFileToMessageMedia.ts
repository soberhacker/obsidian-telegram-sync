/* eslint-disable @typescript-eslint/no-unused-vars */
import bigInt from "big-integer";
import { Api } from "telegram";
import { Buffer } from "buffer";

const WEB_LOCATION_FLAG = 1 << 24; // substitute with actual value
const FILE_REFERENCE_FLAG = 1 << 25; // substitute with actual value

enum FileType {
	THUMBNAIL = 0,
	CHAT_PHOTO = 1, // ProfilePhoto
	PHOTO = 2,
	VOICE = 3, // VoiceNote
	VIDEO = 4,
	DOCUMENT = 5,
	ENCRYPTED = 6,
	TEMP = 7,
	STICKER = 8,
	AUDIO = 9,
	ANIMATION = 10,
	ENCRYPTED_THUMBNAIL = 11,
	WALLPAPER = 12,
	VIDEO_NOTE = 13,
	SECURE_RAW = 14,
	SECURE = 15,
	BACKGROUND = 16,
	DOCUMENT_AS_FILE = 17,
}

// Photo-like file ids are longer and contain extra info, the rest are all documents
const PHOTO_TYPES = new Set([
	FileType.THUMBNAIL,
	FileType.CHAT_PHOTO,
	FileType.PHOTO,
	FileType.WALLPAPER,
	FileType.ENCRYPTED_THUMBNAIL,
]);

const DOCUMENT_TYPES = new Set(Object.values(FileType));

for (const item of PHOTO_TYPES) {
	DOCUMENT_TYPES.delete(item);
}

// converting Telegram Bot Api file_id to Telegram Client Api media object
export function convertBotFileToMessageMedia(fileId: string, fileSize: number): Api.TypeMessageMedia {
	const decoded = rle_decode(b64_decode(fileId));
	const major = decoded[decoded.length - 1];
	const buffer = major < 4 ? decoded.slice(0, -1) : decoded.slice(0, -2);

	let bufferPosition = 0;
	let fileType = buffer.readInt32LE(bufferPosition);
	bufferPosition += 4;
	const dcId = buffer.readInt32LE(bufferPosition);
	bufferPosition += 4;

	const hasWebLocation = Boolean(fileType & WEB_LOCATION_FLAG);
	const hasFileReference = Boolean(fileType & FILE_REFERENCE_FLAG);

	fileType &= ~WEB_LOCATION_FLAG;
	fileType &= ~FILE_REFERENCE_FLAG;

	if (!(fileType in FileType)) {
		throw new Error(`Unknown file_type ${fileType} of file_id ${fileId}`);
	}

	if (hasWebLocation) {
		const { result: url, newPosition } = readString(buffer, bufferPosition);
		bufferPosition = newPosition;

		const accessHash = buffer.readBigInt64LE(bufferPosition);
		bufferPosition += 8;

		// Fake type to return url
		const webpage = new Api.WebPage({
			id: bigInt(accessHash),
			hash: Number(accessHash.toString),
			url: url,
			displayUrl: url,
			attributes: [],
		});

		return new Api.MessageMediaWebPage({
			webpage: webpage,
		});
	}

	let fileReference: Buffer;
	if (hasFileReference) {
		const { result, newPosition } = readBytes(buffer, bufferPosition);
		fileReference = result;
		bufferPosition = newPosition;
	} else {
		fileReference = Buffer.alloc(0);
	}

	const media_id = BigInt(buffer.readBigInt64LE(bufferPosition).toString());
	bufferPosition += 8;
	const access_hash = BigInt(buffer.readBigInt64LE(bufferPosition).toString());
	bufferPosition += 8;

	if (PHOTO_TYPES.has(fileType)) {
		const photo = new Api.Photo({
			id: bigInt(media_id),
			accessHash: bigInt(access_hash),
			fileReference: fileReference,
			dcId: dcId,
			date: 0,
			sizes: [],
		});

		return new Api.MessageMediaPhoto({
			photo: photo,
		});
	}

	const document = new Api.Document({
		id: bigInt(media_id),
		accessHash: bigInt(access_hash),
		mimeType: "",
		date: 0,
		size: bigInt(fileSize),
		dcId: dcId,
		fileReference: fileReference,
		attributes: [],
	});

	return new Api.MessageMediaDocument({
		document: document,
	});
}

// converting Telegram Bot Api file_id to Telegram Client Api media object
export function extractMediaId(fileId: string): number {
	const decoded = rle_decode(b64_decode(fileId));
	const major = decoded[decoded.length - 1];
	const buffer = major < 4 ? decoded.slice(0, -1) : decoded.slice(0, -2);

	let bufferPosition = 0;
	let fileType = buffer.readInt32LE(bufferPosition);
	bufferPosition += 4;
	buffer.readInt32LE(bufferPosition);
	bufferPosition += 4;

	const hasFileReference = Boolean(fileType & FILE_REFERENCE_FLAG);

	fileType &= ~WEB_LOCATION_FLAG;
	fileType &= ~FILE_REFERENCE_FLAG;

	if (!(fileType in FileType)) {
		throw new Error(`Unknown file_type ${fileType} of file_id ${fileId}`);
	}

	if (hasFileReference) {
		const { newPosition } = readBytes(buffer, bufferPosition);
		bufferPosition = newPosition;
	}

	const mediaId = Number(buffer.readBigInt64LE(bufferPosition).toString());
	return mediaId;
}

function b64_decode(s: string): Buffer {
	const base64Padded = s + "=".repeat(mod(-s.length, 4));
	return Buffer.from(base64Padded, "base64");
}

function rle_decode(s: Buffer): Buffer {
	const r: number[] = [];
	let z = false;

	for (let i = 0; i < s.length; i++) {
		const b = s[i];

		if (!b) {
			z = true;
			continue;
		}

		if (z) {
			r.push(...Array(b).fill(0));
			z = false;
		} else {
			r.push(b);
		}
	}

	return Buffer.from(r);
}

function readBytes(buffer: Buffer, position: number): { result: Buffer; newPosition: number } {
	let length = buffer.readUInt8(position);
	position += 1;
	let padding = 0;

	if (length > 253) {
		length = buffer.readUIntLE(position, 3);
		position += 3;
		padding = mod(-length, 4);
	} else {
		padding = mod(-(length + 1), 4);
	}

	const result = buffer.slice(position, position + length);
	position += length + padding;
	return { result, newPosition: position };
}

function readString(buffer: Buffer, position: number): { result: string; newPosition: number } {
	const { result, newPosition } = readBytes(buffer, position);
	return { result: result.toString("utf8"), newPosition };
}

function mod(n: number, m: number): number {
	return ((n % m) + m) % m;
}
