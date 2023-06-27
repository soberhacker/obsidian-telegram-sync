# Changelog


## [1.8.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.7.0...1.8.0) (2023-06-27)


### Features

* add "like" reaction instead of replying ([493edc9](https://github.com/soberhacker/obsidian-telegram-sync/commit/493edc972a6043ce073d1e25ab124a2b8378df6a))
* add announcing latest release features ([06187ac](https://github.com/soberhacker/obsidian-telegram-sync/commit/06187ac8934a0d6df122f0285ac50618d4fa0bce))
* add chat and topic template variables ([60437c9](https://github.com/soberhacker/obsidian-telegram-sync/commit/60437c94817c47b6569580c145bacbec3f8d4fa5))
* add displaying errors ([06edf30](https://github.com/soberhacker/obsidian-telegram-sync/commit/06edf30b84eb73c668ac43a5e2c13fd3acf6ea79))
* add forward from link for own channels ([9018411](https://github.com/soberhacker/obsidian-telegram-sync/commit/9018411d997f4be07c0ec2f01c50ded3d38fb438))
* add forward sender name for hidden accounts ([6904069](https://github.com/soberhacker/obsidian-telegram-sync/commit/6904069187acb6a8cd58e046eea2eb2a80250494))
* add forwardFrom to template parsing ([8c60d93](https://github.com/soberhacker/obsidian-telegram-sync/commit/8c60d939b5003287d88b954f7830252b20939eb6))
* Add main features ([1e479ec](https://github.com/soberhacker/obsidian-telegram-sync/commit/1e479ecffb9b4a9ad3414405e887c551cdffc67e))
* add new template variables ([c503797](https://github.com/soberhacker/obsidian-telegram-sync/commit/c503797e7141409a8cdbeb95f9d0d64e21819147))
* add support of downloading files &gt; 20 MB ([57ec22f](https://github.com/soberhacker/obsidian-telegram-sync/commit/57ec22fd1690c52684fc5ff279057f1b8fea4768))
* add transcribing voice messages to text ([8405f6d](https://github.com/soberhacker/obsidian-telegram-sync/commit/8405f6d3f478aeb1be0cd2f9b8f38d2719958039))
* adding file content to Telegram.md ([dcba08f](https://github.com/soberhacker/obsidian-telegram-sync/commit/dcba08fc5d7c73c98f7f7a62f24f6de783776f59))
* filter telegram username ([87bb95a](https://github.com/soberhacker/obsidian-telegram-sync/commit/87bb95ab97c9ac447623f6450d2fb7111ed23fc0))
* skip processing if the message is a "/start" ([dc72a36](https://github.com/soberhacker/obsidian-telegram-sync/commit/dc72a3643e38546d008dba75c5e0c24f9d005fc3))


### Bug Fixes

* API_ID_PUBLISHED_FLOOD during loading plugin ([ee96f32](https://github.com/soberhacker/obsidian-telegram-sync/commit/ee96f32e09dbe52aa8309049471678e6e2edb7ea))
* caption handling after handling files error ([d0ed63b](https://github.com/soberhacker/obsidian-telegram-sync/commit/d0ed63bef37650763f09fefe23d2a3d2f187492f))
* empty note content template error ([1b74b94](https://github.com/soberhacker/obsidian-telegram-sync/commit/1b74b946100d13a1cc0d09717d17c26228169824))
* false attempt to create a directory structure ([f2a23ad](https://github.com/soberhacker/obsidian-telegram-sync/commit/f2a23adf613d6c37fa31949104c68738be3fcc37))
* ignoring Obsidian File & Link settings ([531c70f](https://github.com/soberhacker/obsidian-telegram-sync/commit/531c70fcd52621d8104c7f2b8f367bbd825bb932))
* Improve bot shutdown behavior when plugin is disabled and enabled again ([#81](https://github.com/soberhacker/obsidian-telegram-sync/issues/81)) ([b112a98](https://github.com/soberhacker/obsidian-telegram-sync/commit/b112a98a5b9fa8e690082f5d6d30f013b939b96e))
* inconsistent file names and extensions ([190f560](https://github.com/soberhacker/obsidian-telegram-sync/commit/190f560e434546df45741a83486ecf85c33706ea))
* it is guaranteed that settings.new(Notes|Files)Location exist ([be00e21](https://github.com/soberhacker/obsidian-telegram-sync/commit/be00e218ffe43a0f0d4c8dba88ffb93b96792988))
* message deletion improvements ([f58cd87](https://github.com/soberhacker/obsidian-telegram-sync/commit/f58cd870f79112e295c639a6da599d016804c384))
* message deletion improvements ([03d499b](https://github.com/soberhacker/obsidian-telegram-sync/commit/03d499b700d0dab69c040e900e44610c0061bf84))
* template variables (context -&gt; content) ([9da819b](https://github.com/soberhacker/obsidian-telegram-sync/commit/9da819b85c37fd565926a36f435666b4c92caa4e))
* two bots instances conflict ([19f6bed](https://github.com/soberhacker/obsidian-telegram-sync/commit/19f6bedb5f1d966bc2f190d49fbd88ebeff193e4))
* undefined this in displayAndLog ([16ad05f](https://github.com/soberhacker/obsidian-telegram-sync/commit/16ad05f148ef6780b7dff4ce119e90651e475d8b))
* unpredictable reacting while loading obsidian ([b95a25b](https://github.com/soberhacker/obsidian-telegram-sync/commit/b95a25b263f53cbf9549c45a91474ae249c7b9d9))

## [1.7.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.6.1...1.7.0) (2023-06-26)


### Features

* add chat and topic template variables ([60437c9](https://github.com/soberhacker/obsidian-telegram-sync/commit/60437c94817c47b6569580c145bacbec3f8d4fa5))
* add support of downloading files &gt; 20 MB ([57ec22f](https://github.com/soberhacker/obsidian-telegram-sync/commit/57ec22fd1690c52684fc5ff279057f1b8fea4768))
* add transcribing voice messages to text ([8405f6d](https://github.com/soberhacker/obsidian-telegram-sync/commit/8405f6d3f478aeb1be0cd2f9b8f38d2719958039))


### Bug Fixes

* caption handling after handling files error ([d0ed63b](https://github.com/soberhacker/obsidian-telegram-sync/commit/d0ed63bef37650763f09fefe23d2a3d2f187492f))
* false attempt to create a directory structure ([f2a23ad](https://github.com/soberhacker/obsidian-telegram-sync/commit/f2a23adf613d6c37fa31949104c68738be3fcc37))
* ignoring Obsidian File & Link settings ([531c70f](https://github.com/soberhacker/obsidian-telegram-sync/commit/531c70fcd52621d8104c7f2b8f367bbd825bb932))
* inconsistent file names and extensions ([190f560](https://github.com/soberhacker/obsidian-telegram-sync/commit/190f560e434546df45741a83486ecf85c33706ea))
* two bots instances conflict ([19f6bed](https://github.com/soberhacker/obsidian-telegram-sync/commit/19f6bedb5f1d966bc2f190d49fbd88ebeff193e4))

## [1.6.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.6.0...1.6.1) (2023-06-09)


### Bug Fixes

* API_ID_PUBLISHED_FLOOD during loading plugin ([ee96f32](https://github.com/soberhacker/obsidian-telegram-sync/commit/ee96f32e09dbe52aa8309049471678e6e2edb7ea))

## [1.6.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.5.0...1.6.0) (2023-06-08)


### Features

* add support of downloading files &gt; 20 MB ([57ec22f](https://github.com/soberhacker/obsidian-telegram-sync/commit/57ec22fd1690c52684fc5ff279057f1b8fea4768))
* skip processing if the message is a "/start" ([dc72a36](https://github.com/soberhacker/obsidian-telegram-sync/commit/dc72a3643e38546d008dba75c5e0c24f9d005fc3))


### Bug Fixes

* undefined this in displayAndLog ([16ad05f](https://github.com/soberhacker/obsidian-telegram-sync/commit/16ad05f148ef6780b7dff4ce119e90651e475d8b))

## [1.5.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.4.0...1.5.0) (2023-05-27)


### Features

* add announcing latest release features ([06187ac](https://github.com/soberhacker/obsidian-telegram-sync/commit/06187ac8934a0d6df122f0285ac50618d4fa0bce))
* add new template variables ([c503797](https://github.com/soberhacker/obsidian-telegram-sync/commit/c503797e7141409a8cdbeb95f9d0d64e21819147))

## [1.4.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.3.0...1.4.0) (2023-05-19)


### Features

* add forward from link for own channels ([9018411](https://github.com/soberhacker/obsidian-telegram-sync/commit/9018411d997f4be07c0ec2f01c50ded3d38fb438))


### Bug Fixes

* false attempt to create a directory structure ([f2a23ad](https://github.com/soberhacker/obsidian-telegram-sync/commit/f2a23adf613d6c37fa31949104c68738be3fcc37))

## [1.3.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.2.0...1.3.0) (2023-05-18)


### Features

* adding file content to Telegram.md ([dcba08f](https://github.com/soberhacker/obsidian-telegram-sync/commit/dcba08fc5d7c73c98f7f7a62f24f6de783776f59))
* add forward sender name for hidden accounts



### Bug Fixes

* caption handling after handling files error
* Unpredictable reacting while loading obsidian

## [1.2.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.1.1...1.2.0) (2023-05-16)


### Features

* add displaying errors ([06edf30](https://github.com/soberhacker/obsidian-telegram-sync/commit/06edf30b84eb73c668ac43a5e2c13fd3acf6ea79))
* filter telegram username ([87bb95a](https://github.com/soberhacker/obsidian-telegram-sync/commit/87bb95ab97c9ac447623f6450d2fb7111ed23fc0))


### Bug Fixes

* Improve bot shutdown behavior when plugin is disabled and enabled again ([#81](https://github.com/soberhacker/obsidian-telegram-sync/issues/81)) ([b112a98](https://github.com/soberhacker/obsidian-telegram-sync/commit/b112a98a5b9fa8e690082f5d6d30f013b939b96e))
* it is guaranteed that settings.new(Notes|Files)Location exist ([be00e21](https://github.com/soberhacker/obsidian-telegram-sync/commit/be00e218ffe43a0f0d4c8dba88ffb93b96792988))
* message deletion improvements ([f58cd87](https://github.com/soberhacker/obsidian-telegram-sync/commit/f58cd870f79112e295c639a6da599d016804c384))
* message deletion improvements ([03d499b](https://github.com/soberhacker/obsidian-telegram-sync/commit/03d499b700d0dab69c040e900e44610c0061bf84))
* template variables (context -&gt; content) ([9da819b](https://github.com/soberhacker/obsidian-telegram-sync/commit/9da819b85c37fd565926a36f435666b4c92caa4e))
* two bots instances conflict ([19f6bed](https://github.com/soberhacker/obsidian-telegram-sync/commit/19f6bedb5f1d966bc2f190d49fbd88ebeff193e4))

## [1.1.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.1.0...1.1.1) (2023-04-30)


### Bug Fixes

* template variables (context -&gt; content) ([9da819b](https://github.com/soberhacker/obsidian-telegram-sync/commit/9da819b85c37fd565926a36f435666b4c92caa4e))

## [1.1.0](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.0.1...1.1.0) (2023-04-28)


### Features

* add forwardFrom to template parsing ([8c60d93](https://github.com/soberhacker/obsidian-telegram-sync/commit/8c60d939b5003287d88b954f7830252b20939eb6))

## [1.0.1](https://github.com/soberhacker/obsidian-telegram-sync/compare/1.0.0...1.0.1) (2023-04-20)


### Bug Fixes

* message deletion improvements ([03d499b](https://github.com/soberhacker/obsidian-telegram-sync/commit/03d499b700d0dab69c040e900e44610c0061bf84))

## [1.0.0] (2023-04-19)


### Features

* Add main Telegram Sync features ([1e479ec](https://github.com/soberhacker/obsidian-telegram-sync/commit/1e479ecffb9b4a9ad3414405e887c551cdffc67e))
