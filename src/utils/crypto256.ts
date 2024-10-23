import crypto from "crypto";

const algorithm = "aes-256-cbc";
const defaultKey = "soberhackerKey";
const defaultIV = "soberhackerIV";

export function encrypt(text: string, key = defaultKey, iv = defaultIV): string {
	const cipher = crypto.createCipheriv(algorithm, key, iv);
	let encrypted = cipher.update(text, "utf8", "hex");
	encrypted += cipher.final("hex");
	return encrypted;
}

export function decrypt(encryptedText: string, key = defaultKey, iv = defaultIV): string {
	const decipher = crypto.createDecipheriv(algorithm, key, iv);
	let decrypted = decipher.update(encryptedText, "hex", "utf8");
	decrypted += decipher.final("utf8");
	return decrypted;
}
