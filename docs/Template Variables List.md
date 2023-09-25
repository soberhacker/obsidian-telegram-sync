### Message Filter Variables

```ts
{{all}} - all messages
{{user=VALUE}} - messages from user with username, full name or id equal VALUE
{{chat=VALUE}} - messages in bot | group | channel with name or id equal VALUE
{{topic=VALUE}} - messages in topic with name VALUE
{{forwardFrom=VALUE}} - messages forwarded from chat or user with name VALUE
{{content~VALUE}} - messages contain text VALUE
{{voiceTranscript~VALUE}} - voice transcripts contain text VALUE
```

#### Filter examples:

```js
// messages from group "My Notes" in topic "Memes" will be selected
{{chat=My Notes}}{{topic=Memes}}
// messages that simultaneously have hash tags #video and #movie will be selected
{{content~#video}}{{content~#movie}}
```

-   AND is default operator between conditions
-   If **Message Filter** is unspecified, filter by default will be equal {{all}}
    <br><br>

### Generic Template Variables

```ts
{{content:XX}} - XX characters of the message text
{{voiceTranscript:XX}} - XX characters of voice transcript
{{chat}} - link to the chat (bot | group | channel)
{{chatId}} - id of the chat (bot | group | channel)
{{chat:name}} - name of the chat (bot | group | channel)
{{topic}} - link to the topic (if the topic name displays incorrect, set the name manually using bot command "/topicName NAME")
{{topic:name}} - name of the topic
{{topicId}} - head message id representing the topic
{{messageId}} - message id
{{replyMessageId}} - reply message id
{{user}} - link to the user who sent the message
{{user:name}} - username who sent the message
{{user:fullName}} - full name who sent the message
{{userId}} - id of the user who sent the message
{{forwardFrom}} - link to the forwarded message or its creator (user | channel)
{{forwardFrom:name}} - name of forwarded message creator
{{messageDate:YYYYMMDD}} - date, when the message was sent
{{messageTime:HHmmss}} - time, when the message was sent
{{creationDate:YYYYMMDD}} - date, when the message was created
{{creationTime:HHmmss}} - time, when the message was created
{{hashtag:[X]}} - hashtag (without #) at number X in the message text
```

-   All available formats for dates and time you can find in [Moment JS Docs](https://momentjs.com/docs/#/parsing/string-format/)
-   **Generic variables** can be used in the following content and path templates
    <br><br>

### Note Content Variables

```ts
{{content}} - forwarded from + file | image + message text
{{content:text}} - only message text
{{content:[X-Y]}} - all lines from line number X to Y, inclusive
{{files}} - files | images  ![]()
{{files:links}} - links to files | images []()
{{voiceTranscript}} - transcribing voice (video notes!) to text (same limits as for Telegram Premium subscribers)
{{url1}} - first url from the message
{{url1:previewYYY}} - first url preview with YYY pixels height (default 250)
{{replace:TEXT=>WITH}} - replace or delete text in resulting note (\n - new line)
```

#### Note content template example:

```
{{messageDate:YYYY}} {{content:[1]}}

{{content:[2]}} - the second line
{{content:[2-]}} - from the second line to the last
{{content:[-1]}} - the last line
{{content:[2-4]}} - from the second to the fourth lines

Source: {{chat}}-{{forwardFrom}}
Created: {{creationDate:YYYY-DD-MM}} {{creationTime:HH:mm:ss}}
{{replace:\n\n=>\n}}
```

-   If **Template file** is unspecified, template by default will be equal {{content}}
    <br><br>

### Note Path Variables

```ts
{{content:XX}} - XX characters of the message text (max 100 characters)
{{content:[X]}} - message line number X
{{messageTime:YYYYMMDDHHmmssSSS}} - use full time format for creating unique note names
```

#### Note paths examples:

```js
// A separate note is created for each message, because note names are based on message text and time
Telegram/{{content:30}} - {{messageTime:YYYYMMDDHHmmssSSS}}.md
// All message are appended to the note with name "Telegram.md"
Telegram.md
// All messages from one day are added to a daily note
{{messageDate:YYYYMMDD}}.md
// For every chat will be created separate folder
myNotes/{{chat:name}}/{{forwardFrom:name}}/{{content:[1]}}.md
// Messages are grouped by year, month, day and time
myNotes/{{messageDate:YYYY/MM/DD}}/{{messageTime:HHmmssSSS}}.md
```

```json
⚠️ If a note path template is empty, then notes will not be created
⚠️ If a note with such name exists then new data will be always appended to this notes
```

### File Path Variables

```ts
{{file:type}} - file type identified by Telegram (video, audio, voice, photo, document)
{{file:extension}} - file extension (mp3, ogg, docx, png...)
{{file:name}} - file name assigned by Telegram (without extension)
```

#### File paths examples:

```js
Telegram/{{file:type}}s/{{file:name}} - {{messageTime:YYYYMMDDHHmmssSSS}}.{{file:extension}}
myFiles/{{forwardFrom:name}}_{{file:name}}_{{messageTime:YYYYMMDDHHmmssSSS}}.{{file:extension}}
myFiles/{{messageDate:YYYY/MM/DD}}/{{file:type}}.{{messageTime:HHmmssSSS}}.{{file:name}}.{{file:extension}}
```

```json
⚠️ If a file path template is empty then files will not be saved
⚠️ If a file already exists, ` - {{messageTime:YYYYMMDDHHmmssSSS}}` will be added to its name
```
