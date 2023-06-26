export const version = "1.7.0";
export const showInTelegram = true;
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
    {{content}} - forwarded from + file content + message text and urls + first url preview
    {{content:firstLine}} - first line of the message text
    {{content:text}} - only message text
    {{file}} - only file content ![]()
- add transcribing voices (for Telegram Premium subscribers only)
	{{voiceTranscript}} - transcribing to text
* To get full list tap on <a href='https://github.com/soberhacker/obsidian-telegram-sync/blob/main/docs/Template%20Variables%20List.md'>Template Variables List</a>
* If Note Content Template is unspecified, template by default will be equal {{content}}. This variable is used to convey the appearance of the note as similar to the message as possible.

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
