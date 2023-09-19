import { compareVersions } from "compare-versions";

export const version = "2.0.0";
// TODO add Demo gif and screenshots to readme.md
// --------F----------
// TODO logging what distribution rule was selected
// TODO getting messages one by one instead of parallel processing
// TODO add possibility to change appending order
// TODO add messagesLeftCnt displaying in status bar
// TODO translating messages
// --------P--------
// TODO getting messages older than 24 hours
// TODO getting messages from other bots in group chats
// TODO post messages in selected chats
// ## Demo gif example
//![](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demos/demo1.gif)<br>
export const showNewFeatures = true;
export let showBreakingChanges = true;

const newFeatures =
	"This release introduces the long-awaited feature of Path Templates. " +
	"This feature will help personalize your experience in many many ways, including:\n" +
	" - customizing note and file names\n" +
	" - appending data to any periodic notes (daily notes, etc)\n" +
	" - distributing messages across different folders\n" +
	"Many thanks to all contributors, especially to @ro_mashaaa, @fokinevgenij!";
export const breakingChanges =
	"⚠️ <b><i>Due to breaking changes, it is better to check all plugin settings again! Apologies</i></b> ⚠️";

const telegramChannelLink = "<a href='https://t.me/obsidian_telegram_sync_insider'>channel</a>";
const telegramChannelIntroduction = `Subscribe to the plugin's ${telegramChannelLink} to not only silence these informational messages in your bot, but also to be the first to get all the latest updates and a complete list of new features.`;
const telegramChatLink = "<a href='https://t.me/ObsidianTelegramSync'>chat</a>";
const telegramChatIntroduction = `For discussions, please feel free to join the plugin's ${telegramChatLink}.`;
const donation =
	"If you appreciate this plugin and would like to support its continued development, please consider donating through the buttons below!";
const bestRegards = "Best regards,\nYour soberhacker🍃🧘💻\n⌞";

export const notes = `
<u><b>Telegram Sync ${version}</b></u>\n
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

	if (packageVersion !== version) {
		console.error(`Failed! Release notes are outdated! ${packageVersion} !== ${version}`);
		process.exit(1);
	}
}
