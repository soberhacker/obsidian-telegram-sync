import { compareVersions } from "compare-versions";

export const version = "2.1.0";
// TODO fix {{chat}} to provide bot names instead user names https://t.me/ObsidianTelegramSync/421
// TODO getting messages one by one instead of parallel processing
// TODO logging what distribution rule was selected

// TODO translating messages
// TODO notify in setting that new beta version is ready for installing
// TODO add messagesLeftCnt displaying in status bar
export const showNewFeatures = true;
export let showBreakingChanges = false;

const newFeatures =
	"This release introduces the capability to modify both the order in which messages are appended and the delimiter used between messages when they are appended to a single note";
export const breakingChanges =
	"⚠️ <b><i>Due to breaking changes, it is better to check all plugin settings again! Apologies</i></b> ⚠️";

export const telegramChannelLink = "https://t.me/+FJ2zDTyyFM0yMGZk";
const telegramChannelAHref = `<a href='${telegramChannelLink}'>channel</a>`;
const telegramChannelIntroduction = `Subscribe to the plugin's ${telegramChannelAHref} to not only silence these informational messages in your bot, but also to be the first to get all the latest updates and a complete list of new features.`;
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
