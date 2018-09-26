const { Message } = require('botfuel-dialog');

module.exports = class TransferAction extends Message {
  constructor({
    distributionRuleId,
    failureMessage = 'Le transfert a échoué.',
    awaitDuration = 30,
  }) {
    super('transfer', 'bot', null, {
      distributionRuleId,
      failureMessage,
      awaitDuration,
    });
  }
};
