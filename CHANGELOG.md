# Changelog

## [3.1.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/3.0.0...3.1.0) (2024-09-25)


### Features

* appending new messages under a note heading ([0b08384](https://github.com/soberhacker/obsidian-telegram-sync/commit/0b0838481bde3b68e4d92f8e7fc923bf96d69e82))
* getting to the channel from settings ([3644661](https://github.com/soberhacker/obsidian-telegram-sync/commit/364466152999872de496b6b73d4297385653d7b0))
* ignore formatting (bold, italic, underline) in the notes names ([26c584d](https://github.com/soberhacker/obsidian-telegram-sync/commit/26c584da2c583e67d55c97b9149fa087abc3d243))
* mark message as processed by bot reaction ([3cd40f4](https://github.com/soberhacker/obsidian-telegram-sync/commit/3cd40f43963cf60bac2d187e3108b34822522311))
* process old messages after sleep or lack of internet ([6b1b3c4](https://github.com/soberhacker/obsidian-telegram-sync/commit/6b1b3c4b4c3e3f1eaa94a2857bff7fae91d9198d))
* telegram channel is free ([f73cf0f](https://github.com/soberhacker/obsidian-telegram-sync/commit/f73cf0fba65fe17c82e942901d3ed10a751025b4))


### Bug Fixes

* "Bytes or str expected, not Buffer" error on authorizing the user ([cb065ed](https://github.com/soberhacker/obsidian-telegram-sync/commit/cb065ed43264b863e790cf409a6c98b0b1a7dea5))
* connecting user issues ([b012b59](https://github.com/soberhacker/obsidian-telegram-sync/commit/b012b5989ab0eab99dfaaa3714f399b08b266eeb))
* duplicate notes with emojis in names in Windows 10 ([365d4ef](https://github.com/soberhacker/obsidian-telegram-sync/commit/365d4efd1d434196d355a72835f58ac783245d89))
* markdown formatting of messages with attachments ([e164e0a](https://github.com/soberhacker/obsidian-telegram-sync/commit/e164e0ac239337273e2f093d3d8e8bd174cbfcbb))
* missing first letter of logged message ([be50838](https://github.com/soberhacker/obsidian-telegram-sync/commit/be50838df4d5ee263e8c0031a957bcd467e306aa))
* not processing edited messages ([71a63bb](https://github.com/soberhacker/obsidian-telegram-sync/commit/71a63bb84f09891ac8619d7513ac1586d27bf748))
* partially deleting of media groups ([9b52c40](https://github.com/soberhacker/obsidian-telegram-sync/commit/9b52c4054c036f282c8e5dfe82e7de31ca30b165))

## [3.0.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/3.0.0...3.0.0) (2024-01-08)

### Bug Fixes

-   empty css ([2cb867f](https://github.com/soberhacker/obsidian-telegram-sync/commit/2cb867fbacefca3cd759d7849b95df5ccb0efd5e))

### Miscellaneous Chores

-   release 3.0.0 ([bcdc23b](https://github.com/soberhacker/obsidian-telegram-sync/commit/bcdc23b29bc38c3eb36745c96ff73a2d02963a91))

## [2.2.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/2.1.0...2.2.0) (2023-10-18)

### Features

-   add privacy policy ([c8d843b](https://github.com/soberhacker/obsidian-telegram-sync/commit/c8d843b82d98d639563ba339bd2a232c88aec97d))

### Bug Fixes

-   broken {{content:[1]}} in note path template ([bc6278d](https://github.com/soberhacker/obsidian-telegram-sync/commit/bc6278d6de7183fa078f7f391ba4b11a66fbbcef))
-   skipping messages when file download disabled ([aab142b](https://github.com/soberhacker/obsidian-telegram-sync/commit/aab142bed4789fc70bca72984a09e1b3e7b74a80))

## [2.1.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/2.0.0...2.1.0) (2023-10-10)

### Features

-   message appending order and delimiters ([59ee79a](https://github.com/soberhacker/obsidian-telegram-sync/commit/59ee79aff77c20719c6d83e58c8bd4468ac6a0d3))
-   message appending order and delimiters ([59ee79a](https://github.com/soberhacker/obsidian-telegram-sync/commit/59ee79aff77c20719c6d83e58c8bd4468ac6a0d3))

### Bug Fixes

-   {{chat..}} variables for bots show user data ([8fc1f45](https://github.com/soberhacker/obsidian-telegram-sync/commit/8fc1f45bd687a94079d8efc611dafcdd5d271a65))
-   {{voiceTranscr}} and{{content}} compatibility ([be81d1c](https://github.com/soberhacker/obsidian-telegram-sync/commit/be81d1c47912a338dc688297fcaad1b260bbc5f9))
-   UI improvements ([8655a6d](https://github.com/soberhacker/obsidian-telegram-sync/commit/8655a6d40dd865081c468b33b7bd4c9e7414e4b9))
-   unnecessary characters in path templates ([c0c76c9](https://github.com/soberhacker/obsidian-telegram-sync/commit/c0c76c904baf767f265891ca469cc63716c7e282))

## [2.0.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/v1.12.0...2.0.0) (2023-09-19)

### ⚠ BREAKING CHANGES

-   add message distribution by rules

### Features

-   add path templates ([04242e7](https://github.com/soberhacker/obsidian-telegram-sync/commit/04242e7951b6ff5ae07fddc68de52ad31ef9c42c))

## [1.10.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.9.0...1.10.0) (2023-08-25)

### Features

-   add {{content:[X-Y]}} for getting any lines ([2d2ff65](https://github.com/soberhacker/obsidian-telegram-sync/commit/2d2ff657d2f8d2b778ff52268305ac78411cb811))
-   add channel post handling ([3b06394](https://github.com/soberhacker/obsidian-telegram-sync/commit/3b06394e1d31bb2aeeb65f4be787786b99eaebfa))
-   add connection status indicator ([a921ef4](https://github.com/soberhacker/obsidian-telegram-sync/commit/a921ef4f796590656af3d7c759beeeb60110b89f))
-   add connection status indicator ([a921ef4](https://github.com/soberhacker/obsidian-telegram-sync/commit/a921ef4f796590656af3d7c759beeeb60110b89f))
-   creating a single note for media groups ([7bf3eea](https://github.com/soberhacker/obsidian-telegram-sync/commit/7bf3eea52bc66a6badb8cdde36496023e71134f2))
-   showing release notes only if not in Insider ([1d699b5](https://github.com/soberhacker/obsidian-telegram-sync/commit/1d699b59e233431e04cfbf4322b8020e64f2fc21))
-   simple installing published beta versions ([81a5f8b](https://github.com/soberhacker/obsidian-telegram-sync/commit/81a5f8b4bac7cfb28d8679f6373f837dfe56b661))

### Bug Fixes

-   error "Premature close" ([ea049e4](https://github.com/soberhacker/obsidian-telegram-sync/commit/ea049e48b2f9ba77db47101b445f7900804ddb9f))
-   infinite restarts on non-main device ([6b909f4](https://github.com/soberhacker/obsidian-telegram-sync/commit/6b909f4285e5579dce6403bfdea9cc91b4d1045d))

## [1.9.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.8.1...1.9.0) (2023-08-01)

### Features

-   add {{chat:name}} and {{forwardFrom:name}} ([522cc7b](https://github.com/soberhacker/obsidian-telegram-sync/commit/522cc7b24c0d51b3e727e876baee64b957735be8))
-   add {{topic:name}} variable ([53d0b45](https://github.com/soberhacker/obsidian-telegram-sync/commit/53d0b458493c2d7103ad1a0bebfb7a5a8385733d))
-   add progress bar for transcribing process ([506fad8](https://github.com/soberhacker/obsidian-telegram-sync/commit/506fad83aab64e33b80e725dbfb0dedd4689ad93))
-   hide repeating notifications ([04bf1a1](https://github.com/soberhacker/obsidian-telegram-sync/commit/04bf1a171316a033169de468a36d05e51b85ba2a))
-   no progress bar when downloading file &lt; 3MB ([6e2a3bd](https://github.com/soberhacker/obsidian-telegram-sync/commit/6e2a3bdd12deb388101f8132de1bf572d44624f1))
-   restarting user connection ([0392b5f](https://github.com/soberhacker/obsidian-telegram-sync/commit/0392b5ffa0a013492a4b78d51a85faee44f39c47))

### Bug Fixes

-   error when handling media group ([09b3bf1](https://github.com/soberhacker/obsidian-telegram-sync/commit/09b3bf116428b1522676dc27872b504a1086d7be))
-   handling system messages ([dafb0d6](https://github.com/soberhacker/obsidian-telegram-sync/commit/dafb0d6552eefdc698ae1b9ab108ed6922ca0ce1))
-   occurrence Telegram flood protection ([33d3db2](https://github.com/soberhacker/obsidian-telegram-sync/commit/33d3db24f6ea550aaed70b4d343f609209c24542))
-   unexpected connection loss after awakening ([05d4ad0](https://github.com/soberhacker/obsidian-telegram-sync/commit/05d4ad0a963457976c4dc8e913e9961d99793aab))
-   unnecessary "undefined" in chat link ([738a68f](https://github.com/soberhacker/obsidian-telegram-sync/commit/738a68f0661936062831d1e6e5a9f7cf57d30728))

## [1.8.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.8.0...1.8.1) (2023-07-15)

### Bug Fixes

-   connectiong as user ([c95e277](https://github.com/soberhacker/obsidian-telegram-sync/commit/c95e27771ede0af8dc47bac33d898d39282b06fe))
-   missing bot restarting if no internet at run ([7387675](https://github.com/soberhacker/obsidian-telegram-sync/commit/73876756421a7aab545f91ac1840ebf8cc15fbee))
-   undefined in the beginning of text ([3b75f18](https://github.com/soberhacker/obsidian-telegram-sync/commit/3b75f184116ec367981ef16df921c5439a029ef7))

## [1.8.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.7.1...1.8.0) (2023-07-14)

### Features

-   add reaction👍 to processed messages ([39bdac1](https://github.com/soberhacker/obsidian-telegram-sync/commit/39bdac1ca9f88204a5905af5fdaf21675af3b417))
-   add variable {{content:noFirstLine}} ([c94d761](https://github.com/soberhacker/obsidian-telegram-sync/commit/c94d761ea1408a70fc24d8205516d1f4c4d37c24))

### Bug Fixes

-   displaying when bot connects ([24aeb8a](https://github.com/soberhacker/obsidian-telegram-sync/commit/24aeb8a968f918d57a69dc831b6c00d9e70c677d))
-   Generate proper relative path based on the actual note path ([ff5d328](https://github.com/soberhacker/obsidian-telegram-sync/commit/ff5d3284a639e569c892579daad930f3f1e49802))
-   losing tabs and "&gt;" before content ([6c3743b](https://github.com/soberhacker/obsidian-telegram-sync/commit/6c3743bf7e5bd9dbb4ddec661e09716a79ad9e5b))
-   missing bot restarting if no internet at run ([dccd707](https://github.com/soberhacker/obsidian-telegram-sync/commit/dccd70702e469ece1d3bbdadb28e9c4a5eba5f61))
-   missing of Telegram user reconnects ([658dbb2](https://github.com/soberhacker/obsidian-telegram-sync/commit/658dbb2f6cc4e4f99133d327c45a508b2c4a35a6))
-   template variable "replace" skiping new lines ([600cf4c](https://github.com/soberhacker/obsidian-telegram-sync/commit/600cf4c675e7f3bc316fc4fca54f69d447f3ce2e))

## [1.7.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.7.0...1.7.1) (2023-06-27)

### Bug Fixes

-   empty note content template error ([1b74b94](https://github.com/soberhacker/obsidian-telegram-sync/commit/1b74b946100d13a1cc0d09717d17c26228169824))
-   unnecessary warning logs ([f227207](https://github.com/soberhacker/obsidian-telegram-sync/commit/f227207ffd1a427efb2d2fc9ebcd55c02c6de012))

## [1.7.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.6.1...1.7.0) (2023-06-26)

### Features

-   add chat and topic template variables ([60437c9](https://github.com/soberhacker/obsidian-telegram-sync/commit/60437c94817c47b6569580c145bacbec3f8d4fa5))
-   add support of downloading files &gt; 20 MB ([57ec22f](https://github.com/soberhacker/obsidian-telegram-sync/commit/57ec22fd1690c52684fc5ff279057f1b8fea4768))
-   add transcribing voice messages to text ([8405f6d](https://github.com/soberhacker/obsidian-telegram-sync/commit/8405f6d3f478aeb1be0cd2f9b8f38d2719958039))

### Bug Fixes

-   caption handling after handling files error ([d0ed63b](https://github.com/soberhacker/obsidian-telegram-sync/commit/d0ed63bef37650763f09fefe23d2a3d2f187492f))
-   false attempt to create a directory structure ([f2a23ad](https://github.com/soberhacker/obsidian-telegram-sync/commit/f2a23adf613d6c37fa31949104c68738be3fcc37))
-   ignoring Obsidian File & Link settings ([531c70f](https://github.com/soberhacker/obsidian-telegram-sync/commit/531c70fcd52621d8104c7f2b8f367bbd825bb932))
-   inconsistent file names and extensions ([190f560](https://github.com/soberhacker/obsidian-telegram-sync/commit/190f560e434546df45741a83486ecf85c33706ea))
-   two bots instances conflict ([19f6bed](https://github.com/soberhacker/obsidian-telegram-sync/commit/19f6bedb5f1d966bc2f190d49fbd88ebeff193e4))

## [1.6.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.6.0...1.6.1) (2023-06-09)

### Bug Fixes

-   API_ID_PUBLISHED_FLOOD during loading plugin ([ee96f32](https://github.com/soberhacker/obsidian-telegram-sync/commit/ee96f32e09dbe52aa8309049471678e6e2edb7ea))

## [1.6.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.5.0...1.6.0) (2023-06-08)

### Features

-   add support of downloading files &gt; 20 MB ([57ec22f](https://github.com/soberhacker/obsidian-telegram-sync/commit/57ec22fd1690c52684fc5ff279057f1b8fea4768))
-   skip processing if the message is a "/start" ([dc72a36](https://github.com/soberhacker/obsidian-telegram-sync/commit/dc72a3643e38546d008dba75c5e0c24f9d005fc3))

### Bug Fixes

-   undefined this in displayAndLog ([16ad05f](https://github.com/soberhacker/obsidian-telegram-sync/commit/16ad05f148ef6780b7dff4ce119e90651e475d8b))

## [1.5.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.4.0...1.5.0) (2023-05-27)

### Features

-   add announcing latest release features ([06187ac](https://github.com/soberhacker/obsidian-telegram-sync/commit/06187ac8934a0d6df122f0285ac50618d4fa0bce))
-   add new template variables ([c503797](https://github.com/soberhacker/obsidian-telegram-sync/commit/c503797e7141409a8cdbeb95f9d0d64e21819147))

## [1.4.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.3.0...1.4.0) (2023-05-19)

### Features

-   add forward from link for own channels ([9018411](https://github.com/soberhacker/obsidian-telegram-sync/commit/9018411d997f4be07c0ec2f01c50ded3d38fb438))

### Bug Fixes

-   false attempt to create a directory structure ([f2a23ad](https://github.com/soberhacker/obsidian-telegram-sync/commit/f2a23adf613d6c37fa31949104c68738be3fcc37))

## [1.3.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.2.0...1.3.0) (2023-05-18)

### Features

-   adding file content to Telegram.md ([dcba08f](https://github.com/soberhacker/obsidian-telegram-sync/commit/dcba08fc5d7c73c98f7f7a62f24f6de783776f59))
-   add forward sender name for hidden accounts

### Bug Fixes

-   caption handling after handling files error
-   Unpredictable reacting while loading obsidian

## [1.2.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.1.1...1.2.0) (2023-05-16)

### Features

-   add displaying errors ([06edf30](https://github.com/soberhacker/obsidian-telegram-sync/commit/06edf30b84eb73c668ac43a5e2c13fd3acf6ea79))
-   filter telegram username ([87bb95a](https://github.com/soberhacker/obsidian-telegram-sync/commit/87bb95ab97c9ac447623f6450d2fb7111ed23fc0))

### Bug Fixes

-   Improve bot shutdown behavior when plugin is disabled and enabled again ([#81](https://github.com/soberhacker/obsidian-telegram-sync/issues/81)) ([b112a98](https://github.com/soberhacker/obsidian-telegram-sync/commit/b112a98a5b9fa8e690082f5d6d30f013b939b96e))
-   it is guaranteed that settings.new(Notes|Files)Location exist ([be00e21](https://github.com/soberhacker/obsidian-telegram-sync/commit/be00e218ffe43a0f0d4c8dba88ffb93b96792988))
-   message deletion improvements ([f58cd87](https://github.com/soberhacker/obsidian-telegram-sync/commit/f58cd870f79112e295c639a6da599d016804c384))
-   message deletion improvements ([03d499b](https://github.com/soberhacker/obsidian-telegram-sync/commit/03d499b700d0dab69c040e900e44610c0061bf84))
-   template variables (context -&gt; content) ([9da819b](https://github.com/soberhacker/obsidian-telegram-sync/commit/9da819b85c37fd565926a36f435666b4c92caa4e))
-   two bots instances conflict ([19f6bed](https://github.com/soberhacker/obsidian-telegram-sync/commit/19f6bedb5f1d966bc2f190d49fbd88ebeff193e4))

## [1.1.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.1.0...1.1.1) (2023-04-30)

### Bug Fixes

-   template variables (context -&gt; content) ([9da819b](https://github.com/soberhacker/obsidian-telegram-sync/commit/9da819b85c37fd565926a36f435666b4c92caa4e))

## [1.1.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.0.1...1.1.0) (2023-04-28)

### Features

-   add forwardFrom to template parsing ([8c60d93](https://github.com/soberhacker/obsidian-telegram-sync/commit/8c60d939b5003287d88b954f7830252b20939eb6))

## [1.0.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.0.0...1.0.1) (2023-04-20)

### Bug Fixes

-   message deletion improvements ([03d499b](https://github.com/soberhacker/obsidian-telegram-sync/commit/03d499b700d0dab69c040e900e44610c0061bf84))

## [1.0.0] (2023-04-19)

### Features

-   Add main Telegram Sync features ([1e479ec](https://github.com/soberhacker/obsidian-telegram-sync/commit/1e479ecffb9b4a9ad3414405e887c551cdffc67e))
