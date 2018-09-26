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
