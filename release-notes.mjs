export const version = "1.9.0";
// TODO add Demo gif and screenshots to readme.md
// TODO add thanks for last patrons in donation section
// TODO add notification about new version of Telegram Sync and link to the channel
// TODO add channel link to readme.md
// ## Demo
//![](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demos/demo1.gif)<br>
export const showInTelegram = true;
const newFeatures =
	"This release introduces new template variables {{chat:name}}, {{forwardFrom:name}}, and {{topic:name}}, and also fixes unexpected connection loss along with many other bugs.";
const telegramChannelLink = "<a href='https://t.me/obsidian_telegram_sync_insider'>channel</a>";
const telegramChannelIntroduction = `Find the complete list of new features on the plugin's ${telegramChannelLink}.`;
const telegramChatLink = "<a href='https://t.me/ObsidianTelegramSync'>chat</a>";
const telegramChatIntroduction = `To discuss the plugin's features you're welcome to join the plugin's ${telegramChatLink}.`;
const donation =
	"If you appreciate this plugin and would like to support its continued development, please consider donating through the buttons below!";
const bestRegards = "Best regards,\nYour soberhacker\n⌞";

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
