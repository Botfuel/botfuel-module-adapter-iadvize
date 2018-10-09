const { Message } = require('botfuel-dialog');

module.exports = class StopAction extends Message {
  constructor() {
    super('stop', 'bot', null, {});
  }
};
