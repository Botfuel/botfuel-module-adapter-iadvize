/**
 * Copyright (c) 2017 - present, Botfuel (https://www.botfuel.io).
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const { WebAdapter, Logger } = require('botfuel-dialog');
const {
  adaptText,
  adaptTransfer,
  adaptAwait,
  adaptClose,
  adaptMessage,
  getCloseConversationSettings,
  getOperatorTransferRules,
} = require('../utils/iadvize-adapter-utils');

const WARNING_STEP = 'WARNING';
const CLOSE_STEP = 'CLOSE';

const betweenTransferErrorMessage = [
  'Un spécialiste va vous répondre dans quelques instants...',
  'Un de nos experts se libère et va vous répondre...',
  'Dans quelques secondes un de nos experts va pouvoir vous répondre...',
  'Un spécialiste va vous répondre dans quelques instants...',
  'Un de nos experts se libère et va vous répondre...',
  'Dans quelques secondes un de nos experts va pouvoir vous répondre...',
  'Un spécialiste va vous répondre dans quelques instants...',
  'Un de nos experts se libère et va vous répondre...',
  'Dans quelques secondes un de nos experts va pouvoir vous répondre...',
];

const getRandomElement = (list) => {
  return list[Math.floor(Math.random() * Math.floor(list.length))];
};

const logger = Logger('IadvizeAdapter');

class IadvizeAdapter extends WebAdapter {
  constructor(bot) {
    super(bot);
    this.closeSettings = getCloseConversationSettings(bot.config.adapter);
    this.handleTransfer = this.handleTransfer.bind(this);
    this.handleCloseConversation = this.handleCloseConversation.bind(this);
  }

  async handleTransfer(res, conversationId, idOperator, operator) {
    const { awaitDuration, failureMessage, distributionRules } = await this.bot.brain.userGet(conversationId, 'transfer');
    logger.debug(`
    handleTransfer: conversationId=${conversationId} idOperator=${idOperator} operator=${operator}
    awaitDuration=${awaitDuration} failureMessage=${failureMessage} distributionRules=${distributionRules}
    `);

    const replies = [];
    // Handle transfer failure if there is no distributionRuleId to transfer to
    if (!distributionRules || distributionRules.length === 0) {
      logger.debug('handleTransfer: no distribution rules');
      // Then add awaitDuration and failure message to replies
      replies.push(
        adaptAwait(awaitDuration),
        adaptText(failureMessage),
      );
      // Unset transfer data
      await this.bot.brain.userSet(conversationId, 'transfer', null);
    } else if (distributionRules.length === 1) {
      logger.debug('handleTransfer: only one distribution rule');
      // Then add awaitDuration and failure message to replies
      replies.push(
        adaptTransfer(distributionRules[0].id),
        adaptAwait(awaitDuration),
        adaptText(failureMessage),
      );
      // Unset transfer data
      await this.bot.brain.userSet(conversationId, 'transfer', null);
    } else {
      logger.debug('handleTransfer: many distribution rules');
      // Take the first element from distribution rule ids (and remove it from the rule ids)
      const distributionRule = distributionRules.shift();
      replies.push(
        adaptTransfer(distributionRule.id),
        adaptAwait(10),
        adaptText(getRandomElement(betweenTransferErrorMessage)),
      );
      await this.bot.brain.userSet(conversationId, 'transfer', {
        awaitDuration,
        failureMessage,
        distributionRules,
      });
    }

    logger.debug('handleTransfer: replies', replies);

    return res.send({
      idOperator,
      idConversation: conversationId,
      replies,
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async handleCloseConversation(res, idOperator, conversationId) {
    const close = await this.bot.brain.userGet(conversationId, 'close');
    logger.debug('handleCloseConversation', idOperator, conversationId, close);
    const replies = [];
    if (close && close.step) {
      if (close.step === WARNING_STEP) {
        // Set the next step which is close the conversation
        await this.bot.brain.userSet(conversationId, 'close', {
          step: CLOSE_STEP,
          closeDelay: close.closeDelay,
        });
        // Build replies that await and warn that the conversation will be closed
        replies.push(
          adaptAwait(close.closeWarningDelay),
          adaptText(close.closeWarningMessage),
        );
      } else if (close.step === CLOSE_STEP) {
        // Unset close conversation step
        await this.bot.brain.userSet(conversationId, 'close', null);
        // Build replies that await and close the conversation
        replies.push(
          adaptAwait(close.closeDelay),
          adaptClose(),
        );
      }
    }

    logger.debug('handleCloseConversation: replies', replies);
    // Finally send replies to the user
    return res.send({
      idOperator,
      idConversation: conversationId,
      replies,
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  createRoutes(app) {
    logger.debug('createRoutes');
    // Conversation initialization. This is done when the first user message is sent
    // We don't do much here.
    app.post('/conversations', async (req, res) => {
      res.send({
        idOperator: req.body.idOperator,
        idConversation: req.body.idConversation,
        replies: [],
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    app.get('/conversations/:conversationId', async (req, res) => {
      res.send({
        idConversation: req.params.conversationId,
        idOperator: req.query.idOperator,
        replies: [],
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Bot receives user messages AND bot (operator) messages on this endpoint.
    // This endpoint should return a response containing the bot answers.
    app.post('/conversations/:conversationId/messages', async (req, res) => {
      const { conversationId } = req.params;
      const { idOperator, message, operator } = req.body;
      await this.addUserIfNecessary(conversationId);

      logger.debug('[route] new message author type:', message.author.role);
      logger.debug('[route] operator', operator);

      // Operator messages are sent to this endpoint too, like visitor messages
      if (message.author.role === 'operator') {
        const transfer = await this.bot.brain.userGet(conversationId, 'transfer');

        // If transfer data was saved from the previous step, it means bot has started a transfer
        // and it needs to handle possible transfer failure
        // by awaiting and sending a transfer failure message
        // If the message is sent from operator and is not a transfer request, it means it follows normal replies
        // from the bot, so do not send any reply
        if (transfer) {
          return this.handleTransfer(res, conversationId, idOperator, operator);
        } else {
          return this.handleCloseConversation(res, idOperator, conversationId);
        }
      }

      // Here role === 'visitor'

      let botMessages = await this.bot.handleMessage(
        this.extendMessage({
          type: 'text',
          user: conversationId,
          payload: {
            value: req.body.message.payload.value,
          },
        })
      );

      /**
       * Handling close action from user
       */

      // Look for close message in bot messages
      // Then Store close options in the brain if close message in the list
      // Else store adapter close options in the brain
      const closeMessageIndex = botMessages.findIndex(m => m.type === 'close');
      if (closeMessageIndex !== -1) {
        const closeMessage = botMessages.find(m => m.type === 'close');
        const { closeWarningDelay, closeWarningMessage, closeDelay } = closeMessage.payload.options;
        await this.bot.brain.userSet(conversationId, 'close', {
          step: WARNING_STEP,
          closeWarningDelay: closeWarningDelay,
          closeWarningMessage: typeof closeWarningMessage === 'function'
            ? closeWarningMessage(closeDelay)
            : closeWarningMessage,
          closeDelay: closeDelay,
        });
      } else {
        await this.bot.brain.userSet(conversationId, 'close', {
          step: WARNING_STEP,
          closeWarningDelay: this.closeSettings.closeWarningDelay,
          closeWarningMessage: this.closeSettings.closeWarningMessage,
          closeDelay: this.closeSettings.closeDelay,
        });
      }

      /**
       * Handling Transfer action from user
       */

      const transferMessageIndex = botMessages.findIndex(m => m.type === 'transfer');
      const transferMessage = botMessages.find(m => m.type === 'transfer');

      // If there is a transfer message to proceed then save it in the brain
      if (transferMessage) {
        logger.debug('[route] save transfer message data');
        await this.bot.brain.userSet(conversationId, 'transfer', {
          awaitDuration: transferMessage.payload.options.awaitDuration,
          failureMessage: transferMessage.payload.options.failureMessage,
          distributionRules: getOperatorTransferRules(operator, transferMessage.payload.options.distributionRuleLabels),
        });
      }

      // Handle failure now if transfer message is the first one
      if (transferMessageIndex === 0) {
        logger.debug('[route] handleTransfer when the transfer message is first in message list');
        return this.handleTransfer(res, conversationId, idOperator, operator);
      }

      // Normal case: reply bot messages to the user
      // Note: we filter close message to prevent other messages to be sent
      const filteredMessages = botMessages.filter(m => ['close', 'transfer'].indexOf(m.type) === -1);
      logger.debug('[route] botMessages to send', filteredMessages);

      return res.send({
        idOperator,
        idConversation: conversationId,
        replies: filteredMessages.map(adaptMessage),
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Used by the iAdvize users interface and API to know if the bot is available or not.
    // We implement it at the bot level so if the bot server is not running,
    // the request fails and the bot is set as unavailable.
    app.get('/availability-strategies', (req, res) => {
      res.send([
        {
          strategy: 'customAvailability',
          availability: true,
        },
      ]);
    });
  }
}

module.exports = IadvizeAdapter;
