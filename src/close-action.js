const { Message } = require('botfuel-dialog');

module.exports = class CloseAction extends Message {
  constructor({
    closeWarningDelay = 30,
    closeWarningMessage = 'The conversation will be closed in a few seconds',
    closeDelay = 30,
  }) {
    super('close', 'bot', null, {
      closeWarningDelay,
      closeWarningMessage,
      closeDelay,
    });
  }
};
