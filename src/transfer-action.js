const { Message } = require('botfuel-dialog');

module.exports = class TransferAction extends Message {
  constructor({
    distributionRuleLabels,
    failureMessage = 'Le transfert a échoué.',
    awaitDuration = 30,
  }) {
    super('transfer', 'bot', null, {
      distributionRuleLabels,
      failureMessage,
      awaitDuration,
    });
    this.validateArray('distributionRuleLabels', distributionRuleLabels);
  }

  validate() {
    super.validate();
    this.validateArray('distributionRuleLabels', this.payload.options.distributionRuleLabels);
  }
};
