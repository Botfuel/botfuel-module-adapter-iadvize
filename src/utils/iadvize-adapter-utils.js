const { Logger } = require('botfuel-dialog');

const logger = Logger('IAdvizeAdapterUtils');

// Constants
const DEFAULT_CLOSE_DELAY = 30; // seconds
const DEFAULT_WARNING_DELAY = 30; // seconds
const DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';

// Messages adaptation

/**
 * Adapt text message to iAdvize platform format
 * @param text
 * @returns {Object}
 */
const adaptText = text => ({
  type: 'message',
  payload: {
    contentType: 'text',
    value: text,
  },
  quickReplies: [],
});

/**
 * Adapt await action to iAdvize platform format
 * @param duration
 * @returns {Object}
 */
const adaptAwait = duration => ({
  type: 'await',
  duration: {
    unit: 'seconds',
    value: duration,
  },
});

/**
 * Adapt transfer action to iAdvize platform format
 * @param {String} distributionRuleId - the rule to transfer to
 * @returns {Object}
 */
const adaptTransfer = distributionRuleId => ({
  type: 'transfer',
  distributionRule: distributionRuleId,
});

/**
 * Adapt close action to iAdvize platform format
 * @returns {Object}
 */
const adaptClose = () => ({
  type: 'close',
});

/**
 * Adapt quick replies to iAdvize platform format
 * @param message
 * @returns {Object}
 */
const adaptQuickreplies = message => ({
  type: 'message',
  payload: {
    contentType: 'text',
    value: '',
  },
  quickReplies: message.payload.value.map(qr => ({
    contentType: 'text/quick-reply',
    value: qr,
    idQuickReply: qr,
  })),
});

/**
 * Adapt message to iAdvize platform format
 * @param message
 * @returns {*}
 */
const adaptMessage = (message) => {
  logger.debug('adaptMessage', message);
  switch (message.type) {
    case 'text':
      return adaptText(message.payload.value);
    case 'quickreplies':
      return adaptQuickreplies(message);
    case 'transfer':
      return adaptTransfer(message.payload.options.distributionRuleId);
    case 'close':
      return adaptClose();
    default:
      throw new Error(`Message of type ${message.type} are not supported by this adapter.`);
  }
};

/**
 * Returns close conversation settings so that the bot knows how to handle
 * Conversation closing
 * @param params
 * @returns {Object}
 */
const getCloseConversationSettings = (params) => {
  logger.debug('computeCloseConversationDelay', params);
  const {
    closeWarningDelay,
    closeWarningMessage,
    closeDelay,
  } = params;

  // This is the duration to await before the warning message will be displayed
  let warningDelayValue = DEFAULT_WARNING_DELAY;
  if (!Number.isNaN(closeWarningDelay)) {
    warningDelayValue = parseInt(closeWarningDelay, 10);
  }

  // This is the duration to await between the warning and the close action
  // If there is no more interaction with the bot during this time
  let closeDelayValue = DEFAULT_CLOSE_DELAY;
  if (!Number.isNaN(closeDelay)) {
    closeDelayValue = parseInt(closeDelay, 10);
  }

  // This is the close warning message displayed before the conversation will be closed
  // Can be a String or a Function that take the close conversation delay
  let warningMessageValue = DEFAULT_WARNING_MESSAGE;
  if (closeWarningMessage) {
    warningMessageValue = typeof closeWarningMessage === 'function'
      ? closeWarningMessage(closeDelay)
      : closeWarningMessage;
  }

  return {
    closeWarningDelay: warningDelayValue,
    closeWarningMessage: warningMessageValue,
    closeDelay: closeDelayValue,
  };
};

/**
 * Get transfer distributionRules for the operator provided for the transfer action
 * @param {Object} operator - the operator data
 * @param {Array<String>} names - the names of botfuel routing rules to try for transfer
 * @returns {Array<String>} - the distributions rules ids used a transfer rules ids
 */
const getOperatorTransferRules = (operator, names) => {
  logger.debug(`getOperatorTransferRules: operator=${JSON.stringify(operator)} labels=${JSON.stringify(names)}`);
  // validate rule names to check
  if (!names || names.length === 0) {
    logger.debug('getTransferRules: no botfuel routing rule names provided');
    return [];
  }

  // validate operator
  if (!operator) {
    logger.debug('getTransferRules: no operator provided');
    return [];
  }

  // validate operator botfuel routing rules
  if (!operator.botfuelRoutingRules || operator.botfuelRoutingRules.length === 0) {
    logger.debug('getTransferRules: invalid operator botfuelRoutingRules');
    return [];
  }

  // using a loop to keep the keep to order defined in transfer action botfuelRoutingRuleNames
  const rules = [];
  for (const name of names) {
    const rule = operator.botfuelRoutingRules.find(r => r.enabled && r.name === name);
    if (rule) {
      // if rule match then add it to rules list
      rules.push(rule.routingRule);
    }
  }
  logger.debug('getTransferRules: rules to try for transfer', rules);

  return rules;
};

module.exports = {
  adaptText,
  adaptAwait,
  adaptTransfer,
  adaptClose,
  adaptQuickreplies,
  adaptMessage,
  getCloseConversationSettings,
  getOperatorTransferRules,
};
