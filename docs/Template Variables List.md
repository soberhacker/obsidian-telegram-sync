#### Note Content Template

###### Variables:
```ts
{{content}} - forwarded from + file|image + message text
{{content:text}} - only message text
{{content:firstLine}} - first line of the message text
{{content:noFirstLine}} - the message text without the first line
{{content:XX}} - XX characters of the message text
{{file}} - file|image content ![]()
{{file:link}} - link to the file|image []()
{{voiceTranscript}} - transcribing voice(video notes!) to text (same limits as for Telegram Premium subscribers)
{{voiceTranscript:XX}} - XX symbols of transcribed voices (same limits as for Telegram Premium subscribers)
{{chat}} - link to the chat (bot / group / channel)
{{chatId}} - id of the chat (bot / group / channel)
{{chat:name}} - name of the chat (bot / group / channel)
{{topic}} - link to the topic (if the topic name displays incorrect, set the name manually using bot command "/topicName NAME")
{{topic:name}} - name of the topic
{{topicId}} - head message id representing the topic
{{messageId}} - message id
{{replyMessageId}} - reply message id
{{user}} - link to the user who sent the message
{{userId}} - id of the user who sent the message
{{forwardFrom}} - link to the forwarded message or its creator (user / channel)
{{forwardFrom:name}} - name of forwarded message creator
{{messageDate:YYYYMMDD}} - date, when the message was sent
{{messageTime:HHmmss}} - time, when the message was sent
{{creationDate:YYYYMMDD}} - date, when the message was created
{{creationTime:HHmmss}} - time, when the message was created
{{url1}} - first url from the message
{{url1:previewYYY}} - first url preview with YYY pixels height (default 250)
{{replace:TEXT=>WITH}} - replace or delete text in resulting note (\n - new line)
```

###### Template example:
```
{{messageDate:YYYY}} {{content:firstLine}}

{{content:noFirstLine}}

Source: {{chat}}-{{forwardFrom}}
Created: {{creationDate:YYYY-DD-MM}} {{creationTime:HH:mm:ss}}
{{replace:\n\n=>\n}}
```

- If Note Content Template is unspecified, template by default will be equal {{content}}
- All available formats for dates and time you can find in [Monent JS Docs](https://momentjs.com/docs/#/parsing/string-format/)




#### ❌ Note Path Template (*not implemented*)

###### Variables:
```json
❌{{user:VALUE}} - only when user name equal VALUE use this path
❌{{userId:VALUE}} - only when user id equal VALUE use this path
❌{{chat:VALUE}} - only when chat name equal VALUE use this path
❌{{chatId:VALUE}} - only when chat id equal VALUE use this path
❌{{topic:VALUE}} - only when topic name equal VALUE use this path
❌{{forwardFrom:VALUE}} - only when message creator equal VALUE use this path
```

###### ❌ Note Paths examples (*not implemented*):
```js
// All news are written in one folder, other messages - in file Telegram.md
myNotes/WorldNews/{{forwardFrom:Forbes}}.md
myNotes/WorldNews/{{forwardFrom:The Washington Post}}.md
myNotes/Telegram.md

// Important channels are written in separate folders, other messages - in root folder in separate notes
myNotes/{{chat:Recipies}}/{content:30}.md
myNotes/{{chat:Ideas}}/{{content:firstLine}}.md
myNotes/{{chat:Work}}/{{forwardFrom}}_{{creationDate}}.md
myNotes/{{content:20}}_{{messageDate}}_{{messageTime}}.md

// Other examples
myNotes/inbox.md
myNotes/{{chat}}/{{forwardFrom}}/{{content}}.md
myNotes/{{chat:Surf Shop}}{{user:Me}}/Announcements.md
myNotes/daily/{{messageDate}}.md
myNotes/{{messageDate:YYYY}}/{{forwardFrom}}/{{content:firstLine}}.md
myNotes/{{messageDate:YYYY}}/{{messageDate:MM}}/{{messageDate:DD}}/{{messageTime:HHmmssSSS}}.md
myNotes/{{creationDate:YYYY}}/{{creationDate:MM-DD}}.{{creationTime:HH:mm:ss(SSS)}}.md
```

-  **Note Content Template Variables** are also available here (except for {{file*}}, {{url1*}}, {{replace*}}, {{content}}, {{content:text}})
-  Always define note names and finish paths with *".md"*
-  If a note with such name exists then new data will be always appended to this notes 




#### ❌ File Path Template (*not implemented*)

###### Variables:
```json
❌{{fileType}} - file type identified by Telegram (video, audio, voice, photo, document...)
❌{{fileExtention}} - file extension (mp3, ogg, docx, png...)
❌{{fileName}} - unique file name assigned by Telegram (without extension)
```

###### ❌ File Paths examples (*not implemented*):
```js
myFiles/{{fileType}}/{{fileName}}.{{fileExtension}}
myFiles/{{forwardFrom}}_{{fileName}}.{{fileExtension}}
myFiles/{{messageDate:YYYY}}/{{fileType}}.{{messageTime:HHmmss}}.{{fileName}}.{{fileExtension}}
```

-  **Note Content Template Variables** are also available here (except for {{file*}}, {{url1*}}, {{replace*}}, {{content}}, {{content:text}})
-  Always define file names and finish paths with *".{{fileExtention}}"*
-  If a file with such name exists then new file will be created with auto-generated unique name




#### ⚠ Not Implemented Features ⚠

Integrating these new features might prove challenging and time-consuming, so your assistance would be much appreciated. You can help by:
-  Donating to enhance my motivation
-  Contributing to the development (branch "[develop](https://github.com/soberhacker/obsidian-telegram-sync/tree/develop)")

[![boosty](https://img.buymeacoffee.com/button-api/?text=boosty&emoji=💰&slug=soberhacker&button_colour=f17d1e&font_colour=000000&font_family=Bree&outline_colour=000000&coffee_colour=FFDD00)](https://boosty.to/soberhacker/donate)

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=soberhacker&button_colour=5F7FFF&font_colour=ffffff&font_family=Cookie&outline_colour=000000&coffee_colour=FFFFFF)](https://www.buymeacoffee.com/soberhacker)

[![Ko-fi Donation](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/soberhacker)

[![PayPal](https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png)](https://www.paypal.com/donate/?hosted_button_id=VYSCUZX8MYGCU)