const { Message } = require('botfuel-dialog');

module.exports = class CloseAction extends Message {
  constructor() {
    super('close', 'bot', null, {});
  }
};
