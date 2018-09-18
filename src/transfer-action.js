const { Message } = require('botfuel-dialog');

module.exports = class TransferAction extends Message {
  constructor({ distributionRuleId }) {
    super('transfer', 'bot', null, {
      distributionRuleId,
    });
  }
};
