#### PIN Code Bot Token Encryption

##### What type of encryption does the plugin use?

The plugin uses AES-256 encryption to store the bot token securely. By default, the token is encrypted and saved locally on your device. However, since the plugin is open-source, the encryption key is embedded in the code, making it theoretically possible for other plugins to access the encrypted token.

##### What additional protection does the PIN code provide?

Enabling PIN-based encryption means that the decryption process requires a user-defined PIN, which is not stored. The PIN exists only in the user’s memory, preventing other plugins from accessing it. This extra layer ensures that even if the encryption mechanism is known through the source code, only someone with the correct PIN can decrypt the bot token.

##### What risks does this encryption help prevent?

-   **Misuse of Bot Token**: Prevents scenarios where a malicious plugin could extract the token and use it for unauthorized actions, such as sending spam or other undesired activities through your bot.
-   **Bot Suspension**: Misuse of your bot token could lead to temporary or permanent suspension of your bot, making it unable to create new bots or send messages for a period (e.g., up to a month).

##### How does it work?

When this feature is enabled, you will be prompted to enter your PIN each time Obsidian starts. This PIN is used to decrypt the bot token for the session, keeping the token secure while stored on your device.

##### What to do if you forget your PIN?

If you forget your PIN, you will need to reset the encryption by re-entering your bot token in unencrypted form:

1. Open the plugin settings in Obsidian.
2. Enter your bot token without encryption.
3. Re-enable the encryption feature and set a new PIN.

##### Why is this important?

Given the open-source nature of the plugin, adding a user-defined PIN helps ensure that your bot token remains under your control, even if other plugins attempt to access it. This feature is crucial for maintaining the integrity of your bot and avoiding unintended suspensions or breaches.
