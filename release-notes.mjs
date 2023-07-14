export const version = "1.8.0";
// TODO add Demo gif and screenshots to readme.md
// TODO add thanks for last patrons in donation section
// TODO add notification about new version of Telegram Sync and link to the channel
// ## Demo
//![](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demos/demo1.gif)<br>
export const showInTelegram = true;
const newFeatures =
	"This release offers numerous bug fixes and a few fresh features, including the standout addition - 'like' messages to mark them as processed.";
const telegramChannelLink = "<a href='https://t.me/obsidian_telegram_sync_insider'>Telegram channel</a>";
const telegramChannelIntroduction = `Find the complete list of new features and bug fixes for this release on the plugin's ${telegramChannelLink}. In addition to updates, the channel also offers pre-releases, tips and secrets.`;
const telegramChatLink = "<a href='https://t.me/ObsidianTelegramSync'>Telegram chat</a>";
const telegramChatIntroduction = `To discuss the plugin's features, roadmap, or to share your experiences, you're welcome to join the plugin's ${telegramChatLink}.`;
const donation =
	"If you appreciate this plugin and would like to support its continued development, please consider donating through the buttons below!";
const bestRegards = "Best regards,\nYour soberhacker\n__";

export const releaseNotes = `
<u><b>Telegram Sync ${version}</b></u>\n
🆕 ${newFeatures}\n
💡 ${telegramChannelIntroduction}\n
💬 ${telegramChatIntroduction}\n
🦄 ${donation}\n
${bestRegards}`;

const check = process.argv[2] === "check";

if (check) {
	const packageVersion = process.env.npm_package_version;

	if (packageVersion !== version) {
		console.error(`Failed! Release notes are outdated! ${packageVersion} !== ${version}`);
		process.exit(1);
	}
}
