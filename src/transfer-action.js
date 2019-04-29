const { Message } = require('botfuel-dialog');

module.exports = class TransferAction extends Message {
  constructor({
    botfuelRoutingRules,
    failureMessage = 'Le transfert a échoué.',
    awaitDuration = 30,
  }) {
    super('transfer', 'bot', null, {
      botfuelRoutingRules,
      failureMessage,
      awaitDuration,
    });
    this.validateArray('botfuelRoutingRules', botfuelRoutingRules);
  }

  validate() {
    super.validate();
    this.validateArray('botfuelRoutingRules', this.payload.options.botfuelRoutingRules);
  }
};
