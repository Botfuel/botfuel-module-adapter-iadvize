const { Message } = require('botfuel-dialog');

module.exports = class TransferAction extends Message {
  constructor({
    botfuelRoutingRuleNames,
    failureMessage = 'Le transfert a échoué.',
    awaitDuration = 30,
  }) {
    super('transfer', 'bot', null, {
      botfuelRoutingRuleNames,
      failureMessage,
      awaitDuration,
    });
    this.validateArray('botfuelRoutingRuleNames', botfuelRoutingRuleNames);
  }

  validate() {
    super.validate();
    this.validateArray('botfuelRoutingRuleNames', this.payload.options.botfuelRoutingRuleNames);
  }
};
