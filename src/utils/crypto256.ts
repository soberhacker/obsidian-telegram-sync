import crypto from "crypto";
import { base64ToString } from "src/utils/fsUtils";

const id1 = "c29iZXJoYWNrZXI=";
const id2 = "S2V5";
const id3 = "SVY=";

const algorithm = "aes-256-cbc";
const defaultKey = base64ToString(id1) + base64ToString(id2);
const defaultIV = base64ToString(id1) + base64ToString(id3);

export function encrypt(text: string, key = defaultKey, iv = defaultIV): string {
	const cipher = crypto.createCipheriv(
		algorithm,
		Buffer.from(padOrTrim(key, 32), "utf8"),
		Buffer.from(padOrTrim(iv, 16), "utf8"),
	);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	return encrypted;
}

export function decrypt(encryptedText: string, key = defaultKey, iv = defaultIV): string {
	const decipher = crypto.createDecipheriv(
		algorithm,
		Buffer.from(padOrTrim(key, 32), "utf8"),
		Buffer.from(padOrTrim(iv, 16), "utf8"),
	);
	let decrypted = decipher.update(encryptedText, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}

export function padOrTrim(input: string, length: number) {
	return input.length > length ? input.slice(0, length) : input.padEnd(length, "0");
}
