const { Message } = require('botfuel-dialog');

const DEFAULT_CLOSE_DELAY = 30; // seconds
const DEFAULT_WARNING_DELAY = 30; // seconds
const DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';

module.exports = class CloseAction extends Message {
  constructor({
    closeWarningDelay = DEFAULT_WARNING_DELAY,
    closeWarningMessage = DEFAULT_WARNING_MESSAGE,
    closeDelay = DEFAULT_CLOSE_DELAY,
  }) {
    super('close', 'bot', null, {
      closeWarningDelay,
      closeWarningMessage,
      closeDelay,
    });
  }
};
