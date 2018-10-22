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
 * @returns {{type: string, payload: {contentType: string, value: (string|*|null|string[])}, quickReplies: Array}}
 */
const adaptText = (text) => {
  return {
    type: 'message',
    payload: {
      contentType: 'text',
      value: text,
    },
    quickReplies: [],
  };
};

/**
 * Adapt await action to iAdvize platform format
 * @param duration
 * @returns {{type: string, duration: {unit: string, value: *}}}
 */
const adaptAwait = (duration) => {
  return {
    type: 'await',
    duration: {
      unit: 'seconds',
      value: duration,
    },
  };
};

/**
 * Adapt transfer action to iAdvize platform format
 * @param {String} distributionRuleId - the rule to transfer to
 * @returns {{type: string, distributionRule: string}}
 */
const adaptTransfer = (distributionRuleId) => {
  return {
    type: 'transfer',
    distributionRule: distributionRuleId,
  };
};

/**
 * Adapt close action to iAdvize platform format
 * @returns {{type: string}}
 */
const adaptClose = () => {
  return {
    type: 'close',
  };
};

/**
 * Adapt quick replies to iAdvize platform format
 * @param message
 * @returns {{type: string, payload: {contentType: string, value: string}, quickReplies: {contentType: string, value: T, idQuickReply: T}[]}}
 */
const adaptQuickreplies = (message) => {
  return {
    type: 'message',
    payload: {
      contentType: 'text',
      value: '',
    },
    quickReplies: message.payload.value.map(quickreply => ({
      contentType: 'text/quick-reply',
      value: quickreply,
      idQuickReply: quickreply,
    })),
  };
};

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
      throw new Error(
        `Message of type ${message.type} are not supported by this adapter.`
      );
  }
};

/**
 * Returns close conversation settings so that the bot knows how to handle
 * Conversation closing
 * @param params
 * @returns {{closeWarningDelay: number, closeWarningMessage: string, closeDelay: number}}
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
  if (!isNaN(closeWarningDelay)) {
    warningDelayValue = parseInt(closeWarningDelay, 10);
  }

  // This is the duration to await between the warning and the close action
  // If there is no more interaction with the bot during this time
  let closeDelayValue = DEFAULT_CLOSE_DELAY;
  if (!isNaN(closeDelay)) {
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
 * @param {Array<String>} labels - the labels included in transfer rules label to use as a filter
 * @returns {Array<String>} - the distributions rules ids used a transfer rules ids
 */
const getOperatorTransferRules = (operator, labels) => {
  // Check if label is set
  if (!labels || labels.length === 0) {
    logger.debug('getOperatorTransferRules: no label provided');
    console.log('getOperatorTransferRules: no label provided');
    return [];
  }

  // Check if operator have
  if (!operator) {
    logger.debug('getOperatorTransferRules: no operator data');
    console.log('getOperatorTransferRules: no operator data');
    return [];
  }

  if (!operator.distributionRules || operator.distributionRules.length === 0) {
    logger.debug('getOperatorTransferRules: operator have no distributionRules');
    return [];
  }

  if (
    !operator.availabilityStrategy ||
    !operator.availabilityStrategy.distributionRulesToCheck ||
    operator.availabilityStrategy.distributionRulesToCheck.length === 0
  ) {
    logger.debug('getOperatorTransferRules: operator have no distributionRulesToCheck in is availabilityStrategy');
    console.log('getOperatorTransferRules: operator have no distributionRulesToCheck in is availabilityStrategy');
    return [];
  }

  const { distributionRules, availabilityStrategy } = operator;

  // Filter rules from operator.distributionRules
  // that are in operator.availabilityStrategy.distributionRulesToCheck
  const transferRules = distributionRules.filter(rule => availabilityStrategy.distributionRulesToCheck.indexOf(rule.id) !== -1);
  logger.debug('getOperatorTransferRules: transferRules', transferRules);
  console.log('getOperatorTransferRules: transferRules', transferRules);

  // Filter by labels with label order as priority
  const orderedRules = [];
  labels.forEach((label) => {
    transferRules.forEach(tr => {
      if (tr.label.indexOf(label) !== -1) {
        orderedRules.push(tr);
      }
    });
  });

  logger.debug('getOperatorTransferRules: orderedRules', orderedRules);
  console.log('getOperatorTransferRules: orderedRules', orderedRules);

  return orderedRules;
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
