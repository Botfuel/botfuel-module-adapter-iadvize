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
- Close (included in this module)

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

### Close action

To close the conversation on iAdvize side, include a `CloseAction` in the messages returned by your view:

```js
const { View } = require('botfuel-dialog');
const { CloseAction } = require('botfuel-module-adapter-iadvize');

class TransferView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to close this conversation.'),
      new CloseAction(),
    ];
  }
}
```

The conversation will be closed after a delay where the bot didn't answered anything.

#### Close action delay

The default value of this delay is **5 min** (300 seconds) but it is configurable.

There is two way to configure it, using the bot **configuration** or an **environment variable**.
The environment variable will have the priority over the configuration.

If you want to configure it in the configuration of your bot you can define a key `closeConversationDelay` in the configuration file, under the adapter key:

```js
module.exports = {
  adapter: {
    name: 'iadvize',
    closeConversationDelay: 300, // the value should be in seconds
  },
  modules: ['botfuel-module-adapter-iadvize'],
};
```

If you want to use an environment variable you can define the `CLOSE_CONVERSATION_DELAY` environment variable.
