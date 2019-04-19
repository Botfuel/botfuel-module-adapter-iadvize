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
const { View, BotTextMessage } = require('botfuel-dialog');
const { TransferAction } = require('botfuel-module-adapter-iadvize');

class TransferView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to transfer you, please wait :)'),
      new TransferAction({
        distributionRuleLabels: ['distribution rule label 1', 'distribution rule label 2', ...],
        // Transfer attempt failure message
        failureMessage: 'Sorry, nobody is available right now.',
        // Transfer attempt timeout, default 30 seconds
        awaitDuration: 20,
      }),
    ];
  }
}
```

### Close event

With this Adapter the close event is automatically triggered at the end of bot responses
and the conversation is closed if no more messages are sent during the time before the close event is triggered by iAdvize.

#### Configuration

You can configure 3 options in the config file of your for this event:
- **closeWarningDelay** is the delay before the warning message will be sent
- **closeWarningMessage** is the message that warn the user about the closing of the conversation
- **closeDelay** is the delay after the warning message and before the close event is sent to iAdvize

The **closeWarningDelay** and the **closeDelay** are durations in seconds, they have to be numbers, their default values are both **30 seconds**

The **closeWarningMessage** can be either a string or a function that take the **closeDelay** in parameter so you can easily customize the message displayed.

The configuration of this event is made under the adapter key in the configuration file of the bot:

```js
module.exports = {
  adapter: {
    name: 'iadvize',
    closeWarningDelay: 30,
    closeWarningMessage: (delay) => `The conversation will be closed in ${delay} seconds`,
    closeDelay: 120,
  },
  modules: ['botfuel-module-adapter-iadvize'],
};
```

In this example, the user will receive the message
"The conversation will be closed in 120 seconds" after 30 seconds of inactivity,
and the conversation will be closed 120 seconds after the warning message
if there is still no news messages from the user or the bot.

#### CloseAction

The CloseAction work the same way as the close event described below,
it takes the same parameters as in the bot configuration
but in that case you will configure and trigger the close event through a view.

To use it, include a `CloseAction` in the messages returned by your view:

```js
const { View, BotTextMessage } = require('botfuel-dialog');
const { CloseAction } = require('botfuel-module-adapter-iadvize');

class TransferView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to close this conversation.'),
      new CloseAction({
        closeWarningDelay: 10,
        closeWarningMessage: (delay) => `The conversation will be closed in ${delay} seconds`,
        closeDelay: 10,
      }),
    ];
  }
}
```

In this example, the user will receive the message
"The conversation will be closed in 10 seconds" after 10 seconds of inactivity,
and the conversation will be closed 10 seconds after the warning message
if there is still no news messages from the user or the bot.

#### Default values

- **closeWarningDelay**: 30 seconds
- **closeWarningMessage**: "The conversation will be closed in a few seconds"
- **closeDelay**: 30 seconds

## Add a delay before your quick replies message

To add a delay before displaying the quick replies message you can add a `delay` option to the message

```js
const { View, BotTextMessage, QuickRepliesMessage } = require('botfuel-dialog');

class DelayedQuickRepliesView extends View {
  render() {
    return [
      new BotTextMessage('I’m going to send quick replies with a delay of 500ms.'),
      new QuickrepliesMessage(['hello', 'world'], {
        delay: 0.5,
      }),
    ];
  }
}
```
