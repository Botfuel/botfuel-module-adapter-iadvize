'use strict';

var _require = require('botfuel-dialog'),
    Logger = _require.Logger;

var logger = Logger('IAdvizeAdapterUtils');

// Constants
var DEFAULT_CLOSE_DELAY = 30; // seconds
var DEFAULT_WARNING_DELAY = 30; // seconds
var DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';

// Messages adaptation

/**
 * Adapt text message to iAdvize platform format
 * @param text
 * @returns {{type: string, payload: {contentType: string, value: (string|*|null|string[])}, quickReplies: Array}}
 */
var adaptText = function adaptText(text) {
  return {
    type: 'message',
    payload: {
      contentType: 'text',
      value: text
    },
    quickReplies: []
  };
};

/**
 * Adapt await action to iAdvize platform format
 * @param duration
 * @returns {{type: string, duration: {unit: string, value: *}}}
 */
var adaptAwait = function adaptAwait(duration) {
  return {
    type: 'await',
    duration: {
      unit: 'seconds',
      value: duration
    }
  };
};

/**
 * Adapt transfer action to iAdvize platform format
 * @param {String} distributionRuleId - the rule to transfer to
 * @returns {{type: string, distributionRule: string}}
 */
var adaptTransfer = function adaptTransfer(distributionRuleId) {
  return {
    type: 'transfer',
    distributionRule: distributionRuleId
  };
};

/**
 * Adapt close action to iAdvize platform format
 * @returns {{type: string}}
 */
var adaptClose = function adaptClose() {
  return {
    type: 'close'
  };
};

/**
 * Adapt quick replies to iAdvize platform format
 * @param message
 * @returns {{type: string, payload: {contentType: string, value: string}, quickReplies: {contentType: string, value: T, idQuickReply: T}[]}}
 */
var adaptQuickreplies = function adaptQuickreplies(message) {
  return {
    type: 'message',
    payload: {
      contentType: 'text',
      value: ''
    },
    quickReplies: message.payload.value.map(function (quickreply) {
      return {
        contentType: 'text/quick-reply',
        value: quickreply,
        idQuickReply: quickreply
      };
    })
  };
};

/**
 * Adapt message to iAdvize platform format
 * @param message
 * @returns {*}
 */
var adaptMessage = function adaptMessage(message) {
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
      throw new Error('Message of type ' + message.type + ' are not supported by this adapter.');
  }
};

/**
 * Returns close conversation settings so that the bot knows how to handle
 * Conversation closing
 * @param params
 * @returns {{closeWarningDelay: number, closeWarningMessage: string, closeDelay: number}}
 */
var getCloseConversationSettings = function getCloseConversationSettings(params) {
  logger.debug('computeCloseConversationDelay', params);
  var closeWarningDelay = params.closeWarningDelay,
      closeWarningMessage = params.closeWarningMessage,
      closeDelay = params.closeDelay;

  // This is the duration to await before the warning message will be displayed

  var warningDelayValue = DEFAULT_WARNING_DELAY;
  if (!isNaN(closeWarningDelay)) {
    warningDelayValue = parseInt(closeWarningDelay, 10);
  }

  // This is the duration to await between the warning and the close action
  // If there is no more interaction with the bot during this time
  var closeDelayValue = DEFAULT_CLOSE_DELAY;
  if (!isNaN(closeDelay)) {
    closeDelayValue = parseInt(closeDelay, 10);
  }

  // This is the close warning message displayed before the conversation will be closed
  // Can be a String or a Function that take the close conversation delay
  var warningMessageValue = DEFAULT_WARNING_MESSAGE;
  if (closeWarningMessage) {
    warningMessageValue = typeof closeWarningMessage === 'function' ? closeWarningMessage(closeDelay) : closeWarningMessage;
  }

  return {
    closeWarningDelay: warningDelayValue,
    closeWarningMessage: warningMessageValue,
    closeDelay: closeDelayValue
  };
};

/**
 * Get transfer distributionRules for the operator provided for the transfer action
 * @param {Object} operator - the operator data
 * @param {Array<String>} labels - the labels included in transfer rules label to use as a filter
 * @returns {Array<String>} - the distributions rules ids used a transfer rules ids
 */
var getOperatorTransferRules = function getOperatorTransferRules(operator, labels) {
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

  if (!operator.availabilityStrategy || !operator.availabilityStrategy.distributionRulesToCheck || operator.availabilityStrategy.distributionRulesToCheck.length === 0) {
    logger.debug('getOperatorTransferRules: operator have no distributionRulesToCheck in is availabilityStrategy');
    console.log('getOperatorTransferRules: operator have no distributionRulesToCheck in is availabilityStrategy');
    return [];
  }

  var distributionRules = operator.distributionRules,
      availabilityStrategy = operator.availabilityStrategy;

  // Filter rules from operator.distributionRules
  // that are in operator.availabilityStrategy.distributionRulesToCheck

  var transferRules = distributionRules.filter(function (rule) {
    return availabilityStrategy.distributionRulesToCheck.indexOf(rule.id) !== -1;
  });
  logger.debug('getOperatorTransferRules: transferRules', transferRules);
  console.log('getOperatorTransferRules: transferRules', transferRules);

  // Filter by labels with label order as priority
  var orderedRules = [];
  labels.forEach(function (label) {
    transferRules.forEach(function (tr) {
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
  adaptText: adaptText,
  adaptAwait: adaptAwait,
  adaptTransfer: adaptTransfer,
  adaptClose: adaptClose,
  adaptQuickreplies: adaptQuickreplies,
  adaptMessage: adaptMessage,
  getCloseConversationSettings: getCloseConversationSettings,
  getOperatorTransferRules: getOperatorTransferRules
};