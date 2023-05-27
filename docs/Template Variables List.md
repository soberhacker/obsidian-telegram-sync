#### Note Content Template 

###### Variables:
```ts
❌{{chat}} - link to the chat (bot / group / channel) (not implemented)
❌{{topic}} - topic name (not implemented)
{{userId}} - id of the user who sent the message
{{user}} - link to the user who sent the message
{{content:XX}} - message text: full or of specified length
{{forwardFrom}} - link to the initial creator of the message (user / channel)
{{messageDate:YYYYMMDD}} - date, when the message was sent
{{messageTime:HHmmss}} - time, when the message was sent
{{creationDate:YYYYMMDD}} - date, when the message was created
{{creationTime:HHmmss}} - time, when the message was created
```

###### Template example:
```
{{messageDate:YYYY}} {{content:firstLine}}

{{content}}

Source: {{chat}}-{{forwardFrom}}
Created: {{creationDate:YYYY-DD-MM}} {{creationTime:HH:mm:ss}}
```

- All available formats for dates and time you can find in [Monent JS Docs](https://momentjs.com/docs/#/parsing/string-format/)


#### Note Path Template (❌ not implemented)

###### Variables:
```json
❌{{userId:VALUE}} - only when user id equal VALUE use this path
❌{{user:VALUE}} - only when user name equal VALUE use this path
❌{{chat:VALUE}} - only when chat name equal VALUE use this path
❌{{topic:VALUE}} - only when topic name equal VALUE use this path
❌{{forwardFrom:VALUE}} - only when message creator equal VALUE use this path
```

###### Note Paths examples:
```js
// All news are written in one folder, other messages - in file Telegram.md
myNotes/WorldNews/{{forwardFrom:Forbes}}.md
myNotes/WorldNews/{{forwardFrom:The Washington Post}}.md
myNotes/Telegram.md

// Important channels are written in separate folders, other messages - in root folder in separate notes
myNotes/{{chat:Recipies}}/{context:30}.md
myNotes/{{chat:Ideas}}/{{context:firstLine}}.md
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

-  All **Note Content Template Variables** are also available here
-  Always define note names and finish paths with *".md"*
-  If a note with such name exists then new data will be always appended to this notes 


#### File Path Template (❌ not implemented)

###### Variables:
```json
❌{{fileType}} - file type identified by Telegram (videos, audios, voices, photos, documents...)
❌{{fileExtention}} - file extension (mp3, ogg, docx, png...)
❌{{fileName}} - unique file name assigned by Telegram (without extension)
```

###### File Paths examples:
```js
myFiles/{{fileType}}/{{fileName}}.{{fileExtension}}
myFiles/{{forwardFrom}}_{{fileName}}.{{fileExtension}}
myFiles/{{messageDate:YYYY}}/{{fileType}}.{{messageTime:HHmmss}}.{{fileName}}.{{fileExtension}}
```

-  All **Note Path Template Variables** are also available here
-  Always define file names and finish paths with *".{{fileExtention}}"*
-  If a file with such name exists then new file will be created with auto-generated unique name


#### ⚠ Not Implemented Features ⚠

Integrating these new features might prove challenging and time-consuming, so your assistance would be much appreciated. You can help by:
-  Donating to enhance my motivation
-  Contributing to the development (branch "develop")

[![Crypto Ð⟠na₮i⟠n](https://img.buymeacoffee.com/button-api/?text=Crypto%20Donation&emoji=🚀&slug=soberhacker&button_colour=5b5757&font_colour=ffffff&font_family=Lato&outline_colour=ffffff&coffee_colour=FFDD00)](https://oxapay.com/donate/5855474)

[![Buy me a book](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20book&emoji=📖&slug=soberhacker&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/soberhacker)

[![Ko-fi Donation](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/soberhacker)

[![PayPal](https://www.paypalobjects.com/webstatic/en_US/i/buttons/PP_logo_h_100x26.png)](https://www.paypal.com/donate/?hosted_button_id=VYSCUZX8MYGCU)