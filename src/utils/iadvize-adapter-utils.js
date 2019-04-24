const { Logger } = require('botfuel-dialog');

const logger = Logger('IAdvizeAdapterUtils');

// Constants
const DEFAULT_CLOSE_DELAY = 30; // seconds
const DEFAULT_WARNING_DELAY = 30; // seconds
const DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';
const DELAY_BEFORE_MESSAGE = 0.5; // seconds
const DELAY_BEFORE_QR = 0.75; // seconds

// Messages adaptation

/**
 * Adapt await action to iAdvize platform format
 * @param duration in seconds
 * @returns {Object}
 */
const adaptAwait = duration => ({
  type: 'await',
  duration: {
    unit: 'millis',
    value: parseInt((duration * 1000), 10),
  },
});

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
const adaptClose = (message) => {
  const options = Object.assign({
    closeWarningDelay: DEFAULT_WARNING_DELAY,
    closeWarningMessage: DEFAULT_WARNING_MESSAGE,
    closeDelay: DEFAULT_CLOSE_DELAY,
  }, message.payload.options || {});

  return [
    adaptAwait(options.closeWarningDelay),
    adaptText(options.closeWarningMessage),
    adaptAwait(options.closeDelay),
    { type: 'close' },
  ];
};

/**
 * Adapt quick replies to iAdvize platform format
 * @param message
 * @returns {Object}
 */
const adaptQuickreplies = message => ({
  type: 'message',
  payload: {
    contentType: 'text',
    value: (message.payload.options && message.payload.options.text) || '',
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
      return [adaptText(message.payload.value)];
    case 'quickreplies':
      return [adaptQuickreplies(message)];
    case 'close':
      return adaptClose(message); // already an array
    case 'transfer':
      // transfer action is handled by the adapter and shouldn't be adapted for replies
      return [];
    default:
      throw new Error(`Message of type ${message.type} are not supported by this adapter.`);
  }
};

/**
 * Adapt a list of message to iAdvize platform format with a delay between each
 * @param botMessages
 * @returns {*}
 */
const adaptMessages = botMessages => botMessages
  .reduce((messages, msg, index) => {
    // no delay before the first message
    // or if message is a close message
    if (index === 0 || msg.type === 'close') {
      return [...messages, ...adaptMessage(msg)];
    }

    // quickreplies message with delay
    if (msg.type === 'quickreplies') {
      const qrDelay = (msg.payload.options && msg.payload.options.delay) || DELAY_BEFORE_QR;
      return [...messages, adaptAwait(qrDelay), ...adaptMessage(msg)];
    }

    // other messages with delay
    return [...messages, adaptAwait(DELAY_BEFORE_MESSAGE), ...adaptMessage(msg)];
  }, []);

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
  const warningDelayValue = parseInt(closeWarningDelay, 10) || DEFAULT_WARNING_DELAY;

  // This is the duration to await between the warning and the close action
  // If there is no more interaction with the bot during this time
  const closeDelayValue = parseInt(closeDelay, 10) || DEFAULT_CLOSE_DELAY;

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
 * @param {Array<String>} labels - the labels included in transfer rules label to use as a filter
 * @returns {Array<String>} - the distributions rules ids used a transfer rules ids
 */
const getOperatorTransferRules = (operator, labels) => {
  logger.debug(`getOperatorTransferRules: operator=${JSON.stringify(operator)} labels=${JSON.stringify(labels)}`);
  // Check if label is set
  if (!labels || labels.length === 0) {
    logger.debug('getOperatorTransferRules: invalid labels');
    return [];
  }

  // Check if operator have
  if (!operator) {
    logger.debug('getOperatorTransferRules: invalid operator');
    return [];
  }

  if (!operator.distributionRules || operator.distributionRules.length === 0) {
    logger.debug('getOperatorTransferRules: invalid operator distributionRules');
    return [];
  }

  if (
    !operator.availabilityStrategy ||
    !operator.availabilityStrategy.distributionRulesToCheck ||
    operator.availabilityStrategy.distributionRulesToCheck.length === 0
  ) {
    logger.debug('getOperatorTransferRules: invalid operator availabilityStrategy');
    return [];
  }

  const { distributionRules, availabilityStrategy } = operator;

  // Filter rules from operator.distributionRules
  // that are in operator.availabilityStrategy.distributionRulesToCheck
  const transferRules = distributionRules
    .filter(rule => availabilityStrategy.distributionRulesToCheck.indexOf(rule.id) !== -1);

  // Filter by labels with label order as priority
  const orderedRules = [];
  labels.forEach((label) => {
    transferRules.forEach((tr) => {
      if (tr.label.indexOf(label) !== -1) {
        orderedRules.push(tr);
      }
    });
  });

  logger.debug('getOperatorTransferRules: operator transfer rules computed', orderedRules);
  return orderedRules;
};


module.exports = {
  adaptText,
  adaptAwait,
  adaptTransfer,
  adaptClose,
  adaptQuickreplies,
  adaptMessage,
  adaptMessages,
  getCloseConversationSettings,
  getOperatorTransferRules,
};
