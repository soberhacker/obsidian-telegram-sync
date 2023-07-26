###### example 1
```json
{
    "message_id": 802,
    "from": {
        "id": 1110636370,
        "is_bot": false,
        "first_name": "soberHacker",
        "username": "soberhacker",
        "language_code": "en"
    },
    "chat": {
        "id": 1110636370,
        "first_name": "soberHacker",
        "username": "soberhacker",
        "type": "private"
    },
    "date": 1686431489,
    "reply_to_message": {
        "message_id": 676,
        "from": {
            "id": 1110636370,
            "is_bot": false,
            "first_name": "soberHacker",
            "username": "soberhacker",
            "language_code": "en"
        },
        "chat": {
            "id": 1110636370,
            "first_name": "soberHacker",
            "username": "soberhacker",
            "type": "private"
        },
        "date": 1686087817,
        "forward_from": {
            "id": 1189295682,
            "is_bot": false,
            "first_name": "Sober",
            "last_name": "Hacker",
            "username": "soberHacker"
        },
        "forward_date": 1684404891,
        "text": "All is good?"
    },
    "text": "Yes, I'm ok!"
}
```
###### example 2 (topic message)
```json
{
    "message_id": 9,
    "from": {
        "id": 1110636370,
        "is_bot": false,
        "first_name": "soberHacker",
        "username": "soberhacker",
        "language_code": "en"
    },
    "chat": {
        "id": -1001110672472,
        "title": "My Notes",
        "is_forum": true,
        "type": "supergroup"
    },
    "date": 1686514218,
    "message_thread_id": 3,
    "reply_to_message": {
        "message_id": 3,
        "from": {
            "id": 1110636370,
            "is_bot": false,
            "first_name": "soberHacker",
            "username": "soberhacker",
            "language_code": "en"
        },
        "chat": {
            "id": -1001110672472,
            "title": "My Notes",
            "is_forum": true,
            "type": "supergroup"
        },
        "date": 1684966126,
        "message_thread_id": 3,
        "forum_topic_created": {
            "name": "Topic name",
            "icon_color": 13338331,
            "icon_custom_emoji_id": "5312241539987020022"
        },
        "is_topic_message": true
    },
    "text": "Text is good",
    "is_topic_message": true
}
```
###### example 3 (topic message without topic name)
```json
{
    "message_id": 12,
    "from": {
        "id": 1110636370,
        "is_bot": false,
        "first_name": "soberHacker",
        "username": "soberhacker",
        "language_code": "en"
    },
    "chat": {
        "id": -1001110672472,
        "title": "My Notes",
        "is_forum": true,
        "type": "supergroup"
    },
    "date": 1686514910,
    "message_thread_id": 3,
    "reply_to_message": {
        "message_id": 6,
        "from": {
            "id": 1110636370,
            "is_bot": false,
            "first_name": "soberHacker",
            "username": "soberhacker",
            "language_code": "en"
        },
        "chat": {
            "id": -1001110672472,
            "title": "My Notes",
            "is_forum": true,
            "type": "supergroup"
        },
        "date": 1686514023,
        "message_thread_id": 3,
        "text": "This is message",
        "is_topic_message": true
    },
    "text": "No, I'm message",
    "is_topic_message": true
}
```
###### example 3 (system message (bot deleted, added....))
```json
{
    "message_id": 6471,
    "from": {
        "id": 1110636370,
        "is_bot": false,
        "first_name": "soberhacker",
        "username": "soberhacker",
        "language_code": "ru"
    },
    "chat": {
        "id": -955999997,
        "title": "Test Group",
        "type": "group",
        "all_members_are_administrators": true
    },
    "date": 1689804496,
    "group_chat_created": true
}
```