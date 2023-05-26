// notifying user about latest release
export const pluginVersion = "1.5.0";
export const newFeatures = `
- add new template variables
    {{userId}} - id of the user who sent the message
    {{user}} - link to the user who sent the message
    {{content:XX}} - message text of specified length	
    {{creationDate:YYYYMMDD}} - date, when the message was created
    {{creationTime:HHmmss}} - time, when the message was created
- add <a href='https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md'>template variables guide</a>
`;
// - no bugs, no fixes (create issues on <a href='https://github.com/soberhacker/obsidian-telegram-sync/issues'>github</a>)
export const bugFixes = `
- improve {{forwardFrom}} - link to the initial creator (never empty) of the message (user / channel) 
`;
export const possibleRoadMap = `
- add new template variables
    {{chat}} - link to the chat (bot / group / channel)
    {{topic}} - topic name
- add support of transfering big files (> 20 MB)
- add voice recognition for Telegram Premium subscribers
`;

const check = process.argv[2] === "check";

if (check) {
	const packageVersion = process.env.npm_package_version;
	if (packageVersion !== pluginVersion) {
		console.error("Failed! Release notes are outdated!");
		process.exit(1);
	}
}
