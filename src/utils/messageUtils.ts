import TelegramBot from "node-telegram-bot-api";

// Telegram message size limit is 4096 characters
const TELEGRAM_MESSAGE_LIMIT = 4096;

/**
 * Splits a long message into chunks that fit within Telegram's message size limit
 * @param text The text to split
 * @param limit Maximum characters per chunk (defaults to Telegram's limit)
 * @returns Array of text chunks
 */
export function splitMessageIntoChunks(text: string, limit: number = TELEGRAM_MESSAGE_LIMIT): string[] {
    if (text.length <= limit) {
        return [text];
    }

    const chunks: string[] = [];
    let currentChunk = '';
    const lines = text.split('\n');

    for (const line of lines) {
        // If adding this line would exceed the limit
        if (currentChunk.length + line.length + 1 > limit) {
            // Save current chunk if it's not empty
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }

            // Handle lines longer than the limit
            if (line.length > limit) {
                // Split long line into chunks
                for (let i = 0; i < line.length; i += limit) {
                    chunks.push(line.substring(i, i + limit));
                }
            } else {
                currentChunk = line;
            }
        } else {
            // Add line to current chunk
            currentChunk = currentChunk.length > 0 ? currentChunk + '\n' + line : line;
        }
    }

    // Add the last chunk if it's not empty
    if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Sends a message that may exceed Telegram's size limit by splitting it into chunks
 * @param bot Telegram bot instance
 * @param chatId Chat ID to send the message to
 * @param text Text to send
 * @param options Additional options for the message
 * @returns Array of sent message objects
 */
export async function sendLongMessage(
    bot: TelegramBot,
    chatId: number | string,
    text: string,
    options?: TelegramBot.SendMessageOptions
): Promise<TelegramBot.Message[]> {
    const chunks = splitMessageIntoChunks(text);
    const sentMessages: TelegramBot.Message[] = [];

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
            const message = await bot.sendMessage(chatId, chunk, options);
            sentMessages.push(message);
        } catch (error) {
            console.error(`Failed to send message chunk ${i + 1}/${chunks.length}:`, error);
            throw error;
        }
    }

    return sentMessages;
}
