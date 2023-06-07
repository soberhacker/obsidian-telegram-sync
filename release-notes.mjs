// if "!"" in version code then notify user about latest release
export const pluginVersion = "1.6.0!";
// change session name when changes in plugin require new client authorization
export const sessionName = "telegram_sync_160";
export const newFeatures = `
- add support of downloading files > 20 MB (was quite a tough nut to crack 🤯)
- add skipping command "/start" for keeping empty bots in chat list
- add public <a href='https://t.me/ObsidianTelegramSync'>Telegram chat</a> for communication
`;
// - no bugs, no fixes (create issues on <a href='https://github.com/soberhacker/obsidian-telegram-sync/issues'>github</a>)
export const bugFixes = `
- EISDIR: illegal operation on a directory, read (<a href='https://github.com/soberhacker/obsidian-telegram-sync/issues/108'>issue 108</a>)
- 400 Bad Request: file is too big (<a href='https://github.com/soberhacker/obsidian-telegram-sync/issues/79'>issue 79</a>)
`;
export const possibleRoadMap = `
- add new template variables
    {{chat}} - link to the chat (bot / group / channel)
    {{topic}} - topic name
- send notes (as files) and files from Obsidian to one chat with bot
- don't mark messages as processed and don't delete them (sending of errors will remain)
- change replying to liking👍 when marking a message as processed (needs scanning qr code and entering Telegram password)
- voice recognition for Telegram Premium subscribers (needs scanning qr code and entering Telegram password)

You can "like" one of the possible feature <a href='https://t.me/ObsidianTelegramSync/5'>in Telegram chat</a> to increase its chances of being implemented.
`;

const check = process.argv[2] === "check";

if (check) {
	const pluginVersionCode = pluginVersion.replace(/!/g, "");
	const packageVersion = process.env.npm_package_version;

	if (packageVersion !== pluginVersionCode) {
		console.error("Failed! Release notes are outdated!");
		process.exit(1);
	}
}
