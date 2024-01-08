// TODO translating messages
// TODO notify in setting that new beta version is ready for installing
// TODO add messagesLeftCnt displaying in status bar
import { compareVersions } from "compare-versions";
export const releaseVersion = "3.0.1";
export const showNewFeatures = true;
export let showBreakingChanges = true;

const newFeatures =
	"Main feature of this release is possibility to process messages older than 24 hours if Obsidian wasn't running. This feature available only for the plugin's channel subscribers";
export const breakingChanges = `⚠️ <b><i>In this release, approximately 30 files have been changed. Although this version has gone through beta testing, please pay close attention during the initial runs of the plugin with the old message processing feature enabled.</i></b> ⚠️`;
export const telegramChannelLink = "https://t.me/+J23BEZyLgoYzOTBk";
const telegramChannelAHref = `<a href='${telegramChannelLink}'>channel</a>`;
const telegramChannelIntroduction = `Subscribe to the plugin's ${telegramChannelAHref} to not only silence these informational messages in your bot, but also to be the first to get all the latest updates.`;
const telegramChatLink = "<a href='https://t.me/ObsidianTelegramSync'>chat</a>";
const telegramChatIntroduction = `For discussions, please feel free to join the plugin's ${telegramChatLink}.`;
const donation =
	"If you appreciate this plugin and would like to support its continued development, please consider donating through the buttons below!";
const bestRegards = "Best regards,\nYour soberhacker🍃🧘💻\n⌞";

export const privacyPolicyLink = "https://github.com/soberhacker/obsidian-telegram-sync/blob/main/PRIVACY-POLICY.md";

export const notes = `
<u><b>Telegram Sync ${releaseVersion}</b></u>\n
🆕 ${newFeatures}\n
💡 ${telegramChannelIntroduction}\n
💬 ${telegramChatIntroduction}\n
🦄 ${donation}\n
${bestRegards}`;

export function showBreakingChangesInReleaseNotes() {
	showBreakingChanges = true;
}

export function versionALessThanVersionB(versionA, versionB) {
	if (!versionA || !versionB) return undefined;
	return compareVersions(versionA, versionB) == -1;
}

const check = process.argv[2] === "check";

if (check) {
	const packageVersion = process.env.npm_package_version;

	if (packageVersion !== releaseVersion) {
		console.error(`Failed! Release notes are outdated! ${packageVersion} !== ${releaseVersion}`);
		process.exit(1);
	}
}
