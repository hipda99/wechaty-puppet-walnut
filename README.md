# 5G Chatbot (RCS) Puppet

[![NPM Version](https://badge.fury.io/js/wechaty-puppet-walnut.svg)](https://badge.fury.io/js/wechaty-puppet-walnut)
[![npm (tag)](https://img.shields.io/npm/v/wechaty-puppet-walnut/next.svg)](https://www.npmjs.com/package/wechaty-puppet-walnut?activeTab=versions)
[![NPM](https://github.com/wechaty/wechaty-puppet-walnut/workflows/NPM/badge.svg)](https://github.com/wechaty/wechaty-puppet-walnut/actions?query=workflow%3ANPM)

![5G Chatbot (RCS) Puppet for Wechaty](docs/images/wechaty-puppet-walnut.png)

[![Powered by Wechaty](https://img.shields.io/badge/Powered%20By-Wechaty-brightgreen.svg)](https://github.com/wechaty/wechaty)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-blue.svg)](https://www.typescriptlang.org/)

Wechaty Puppet for 5G Chatbot (RCS)s helps you use Wechaty to manage your 5G Chatbot from <https://www.5g-msg.com/>.

## FEATURES

1. Provide web hook proxy out-of-the-box (powered by [localtunnel](https://github.com/localtunnel/localtunnel))

## USAGE

This documentation assume that you are familiar with Wechaty already.

If you are newbie to Wechaty, please read the following two links first:

1. [Wechaty Website](https://wechaty.js.org)
1. [Wechaty Getting Started](https://github.com/wechaty/wechaty-getting-started)

In order to use `wechaty-puppet-walnut` with Wechaty, just like other puppets as well:

```ts
import { Wechaty }  from 'wechaty'
import { PuppetWalnut } from 'wechaty-puppet-walnut'

const walnut = new PuppetWalnut({
  appId           : OA_APP_ID,
  appSecret       : OA_APP_SECRET,
  token           : OA_TOKEN,
  webhookProxyUrl : 'https://aeb082b9-14da-4c91-bdef-90a6d17a4z98.localtunnel.me',
})

const bot = new Wechaty({
  name: '5g-chatbot',
  puppet: walnut,
})

bot.on('message', msg => {
  if (!msg.self() && msg.type() === bot.Message.Type.Text && /ding/i.test(msg.text())) {
    await msg.say('dong')
  }
})
await bot.start()
```

> For the full source code, see: <examples/ding-dong-bot.ts>

That's it!

## ENVIRONMENTS VARIABLES

You can use environment variables to configure all of the 5G Chatbot (RCS) Development Information.

### `WECHATY_PUPPET_OA_APP_ID`: `appId`

Developer ID(AppID) is the developer ID, Official Account identification code, which can call Official Account API with developer's password.

### `WECHATY_PUPPET_OA_APP_SECRET`: `appSecret`

Developer Password(AppSecret) is the one with high security to verify the identity of Official Account developer.

### `WECHATY_PUPPET_OA_TOKEN`: `token`

Token is set by you for your server(URL) configuration.

### `WECHATY_PUPPET_OA_PORT`

Set `WECHATY_PUPPET_OA_PORT` to your local HTTP Server port number if you have a public server that can be visit from the internet.

After set ``WECHATY_PUPPET_OA_PORT`, the puppet will expose itself to the internet with this port for providing the HTTP service.

### `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL`

Set `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL` to a `localtunnel` supported address so that you will be able to provide the Server Address(URL) for WebHook usage with this URL.

This is the most convenience way to use this puppet, because you can always provide the same URL to 5G Chatbot (RCS) platform no matter where your program are running of.

Currently, you can generate this URL by yourself by:

1. Generate a UUIDv4 use a generator like [UUID Online Generator](https://uuidonline.com)
1. Insert your $UUID to `https://${UUID}.localtunnel.me`

For example, if your UUID is `aeb082b9-14da-4c91-bdef-90a6d17a4z98`, then you can use `https://aeb082b9-14da-4c91-bdef-90a6d17a4z98.localtunnel.me` as `WECHATY_PUPPET_OA_WEBHOOK_PROXY_URL`

Learn more from: [localtunnel](https://localtunnel.github.io/www/)

## DEVELOPMENT

When you start developing the 5G Chatbot (RCS), it will be very helpful with the following tools provided by Tencent:

1. Apply a test Official Account with full privileges for developing
1. Simulate the API calls in a online simulation tool.

### 1 Apply a 5G Chatbot for developing/testing

- 5G消息开发者社区 <https://www.5g-msg.com/>

## RESOURCES

- [RCS Messaging Chatbot, @huan, Mar 27, 2021](https://wechaty.js.org/2021/03/27/rcs-messaging-chatbot/)

## HISTORY

### v0.4 master

### v0.1 (Apr 1, 2018)

Initial version for 5G Chatbot Puppet.

## AUTHOR

[Huan LI](http://linkedin.com/in/zixia) \<zixia@zixia.net\>

<a href="https://stackexchange.com/users/265499">
  <img src="https://stackexchange.com/users/flair/265499.png" width="208" height="58" alt="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites" title="profile for zixia on Stack Exchange, a network of free, community-driven Q&amp;A sites">
</a>

## COPYRIGHT & LICENSE

- Code & Docs © 2021 Huan LI \<zixia@zixia.net\>
- Code released under the Apache-2.0 License
- Docs released under Creative Commons
