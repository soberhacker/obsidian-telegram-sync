export const version = "1.7.1";
// TODO in github actions creating an archive with 3 main files for easy installing
// TODO Add Demo gif and screenshots to readme.md
// ## Demo
//![](https://raw.githubusercontent.com/vslinko/obsidian-outliner/main/demos/demo1.gif)<br>
export const showInTelegram = false;
export const newFeatures = `
- add note template variables:
    {{chat}} - link to the chat (bot / group / channel)
    {{chatId}} - id of the chat (bot / group / channel)
    {{topic}} - link to the topic (if the topic name displays incorrect, set the name manually using bot command "/topicName NAME")
    {{topicId}} - head message id representing the topic
    {{messageId}} - message id
    {{replyMessageId}} - reply message id
    {{url1}} - first url from the message
    {{url1:previewYYY}} - first url preview with YYY pixels height (default 250)
    {{replace:TEXT=>WITH}} - replace or delete text in resulting note
    {{file:link}} - link to the file 
- improve behavior of content insertion 
    {{content}} - forwarded from + file content + message text
    {{content:firstLine}} - first line of the message text
    {{content:text}} - only message text
    {{file}} - only file content ![]()
- add transcribing voices (for Telegram Premium subscribers only)
	{{voiceTranscript}} - transcribing to text
* If Note Content Template is unspecified, template by default will be equal {{content}}
* To get full list tap on <a href='https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md'>Template Variables List</a>

`;
// - no bugs, no fixes (create issues on <a href='https://github.com/soberhacker/obsidian-telegram-sync/issues'>github</a>)
export const bugFixes = `
- missing file captions formatting
- missing inline external links
- problem with nested formattings
- false warnings about two parallel bot connections
- inconsistent names of downloaded files
- ignoring Obsidian File & Link settings
`;
export const possibleRoadMap = `
- add setting Note Path Template to make notes creation more flexible: 
    * setting any note names 
    * using conditions for organizing notes by days, topics etc.
  For example:
    * myNotes/daily/{{messageDate}}.md
    * myNotes/{{chat:Recipies}}/{content:30}.md
    * myNotes/{{chat:Ideas}}/{{content:firstLine}}.md
- send notes (as files) and files from Obsidian to one chat with bot
- don't mark messages as processed and don't delete them (sending of errors will remain)

You can "like" one of the possible feature <a href='https://t.me/ObsidianTelegramSync/5'>in Telegram chat</a> to increase its chances of being implemented.
`;

const check = process.argv[2] === "check";

if (check) {
	const packageVersion = process.env.npm_package_version;

	if (packageVersion !== version) {
		console.error("Failed! Release notes are outdated!");
		process.exit(1);
	}
}
