/* eslint-disable no-mixed-spaces-and-tabs */
import TelegramSyncPlugin from "../../../main";
import TelegramBot from "node-telegram-bot-api";
import { getFileObject } from "./getters";
import { spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import { join, dirname } from 'path';
import { sendLongMessage } from "../../../utils/messageUtils";

const readFileAsync = promisify(fs.readFile);
const unlinkAsync = promisify(fs.unlink);

async function processTranscriptionCommand(filepath: string, vaultRoot: string, plugin: TelegramSyncPlugin): Promise<string> {
    const fullPath = join(vaultRoot, filepath);
    const CWD = dirname(fullPath);
    const txtPath = fullPath.replace(/\.[^/.]+$/, ".txt");
    
    // Prepare command by replacing placeholders
    const cmd = plugin.settings.transcription.command
        .replace('{{input}}', fullPath)
        .replace('{{output}}', txtPath);

    // Prepare environment with custom PATH
    const env = {
        ...process.env,
        PATH: `${process.env.PATH}:${plugin.settings.transcription.path}`
    };

    return new Promise((resolve, reject) => {
        // Split command into array for spawn
        const [command, ...args] = cmd.split(' ');
        
        const process = spawn(command, args, {
            cwd: CWD,
            env,
            shell: true
        });

        let stdoutData = '';
        let stderrData = '';

        process.stdout.on('data', (data) => {
            const output = data.toString();
            stdoutData += output;
            console.log('Transcription output:', output);
        });

        process.stderr.on('data', (data) => {
            const output = data.toString();
            stderrData += output;
            console.log('Transcription error:', output);
        });

        process.on('close', async (code) => {
            if (code !== 0) {
                reject(new Error(`Transcription process exited with code ${code}\nStderr: ${stderrData}`));
                return;
            }

            try {
                const content = await readFileAsync(txtPath, 'utf8');
                await unlinkAsync(txtPath);
                resolve(content);
            } catch (error) {
                reject(error);
            }
        });

        process.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Sends transcription as a reply to the original message, handling long transcriptions by splitting into chunks
 */
async function sendTranscriptionReply(
    plugin: TelegramSyncPlugin,
    msg: TelegramBot.Message,
    transcription: string
): Promise<void> {
    if (!plugin.settings.transcription.replyWithTranscription || !plugin.bot) {
        return;
    }

    try {
        await sendLongMessage(plugin.bot, msg.chat.id, transcription, {
            reply_to_message_id: msg.message_id
        });
    } catch (error) {
        console.error('Failed to reply with transcription:', error);
    }
}

export async function transcribeFile(
    filePath: string,
    plugin: TelegramSyncPlugin,
    msg: TelegramBot.Message
): Promise<string> {
    if (!plugin.settings.transcription.enabled) {
        return '';
    }

    const { fileType } = getFileObject(msg);
    const supportedFileTypes = ['audio', 'voice', 'video', 'video_note'];
    if (!supportedFileTypes.includes(fileType)) {
        return '';
    }

    try {
        const transcription = await processTranscriptionCommand(
            filePath, 
            plugin.app.vault.adapter.getBasePath(), 
            plugin
        );
        console.log('Transcribed text:', transcription);
        if (!transcription) {
            return '';
        }
        
        await sendTranscriptionReply(plugin, msg, transcription);
        
        return plugin.settings.transcription.template.replace('{text}', transcription);
    } catch (error) {
        console.error('Failed to transcribe file:', error);
        return '';
    }
}
