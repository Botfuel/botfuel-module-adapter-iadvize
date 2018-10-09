# botfuel-module-adapter-iadvize

Iadvize Adapter for Botfuel

## Installation

In your botfuel project, run :

```shell
npm install --save botfuel-module-adapter-iadvize
```

## How to use the adapter

Create a new config file in the root directory of your project (eg: iadvize-config.js)

```js
module.exports = {
  adapter: {
    name: 'iadvize',
  },
  modules: ['botfuel-module-adapter-iadvize'],
};
```

## Supported messages types

- Text messages
- Quickreplies
- Transfer (included in this module)
- Stop (included in this module)

### Transfer action

To transfer to a distribution rule, include a `TransferAction` in the messages returned by your view:

```js
const { View } = require('botfuel-dialog');
const { TransferAction } = require('botfuel-module-adapter-iadvize');

class TransferView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to transfer you, please wait :)'),
      new TransferAction({
        distributionRuleId: 'the distribution rule id you want to transfer to',
        // Transfer attempt failure message
        failureMessage: 'Sorry, nobody is available right now.',
        // Transfer attempt timeout, default 30 seconds
        awaitDuration: 20,
      }),
    ];
  }
}
```

### Stop action

The stop action is used to close a conversation after a configurable delay where the bot didn't answered anything.

```js
const { View } = require('botfuel-dialog');
const { StopAction } = require('botfuel-module-adapter-iadvize');

class TransferView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to close this conversation.'),
      new StopAction(),
    ];
  }
}
```

#### Stop action delay

This delay is the delay after which the conversation will be closed on iAdvize.

There is two way to define it, by using the bot **configuration** or a **environment variable**.
The environment variable will have the priority over the configuration.

The default value of the delay is **5 min** (300 seconds).

If you want to do it in the configuration of your bot you can define a key `stopConversationDelay` in the configuration file, under the adapter key:

```js
module.exports = {
  adapter: {
    name: 'iadvize',
    stopConversationDelay: 300, // the value is in seconds
  },
  modules: ['botfuel-module-adapter-iadvize'],
};
```

If you want to use an environment variable you can define the `STOP_CONVERSATION_DELAY` environment variable.
