const { Message } = require('botfuel-dialog');
const {
  DEFAULT_WARNING_DELAY,
  DEFAULT_WARNING_MESSAGE,
  DEFAULT_CLOSE_DELAY,
} = require('./adapters/iadvize-adapter');

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
