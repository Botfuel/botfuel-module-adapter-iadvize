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
  adaptMessages,
  getCloseConversationSettings,
  getOperatorTransferRules,
} = require('../utils/iadvize-adapter-utils');

const WARNING_STEP = 'WARNING';
const CLOSE_STEP = 'CLOSE';
const DELAY_BETWEEN_MESSAGES = 0.5;

const betweenTransferErrorMessage = [
  'Un spécialiste va vous répondre dans quelques instants...',
  'Un de nos experts se libère et va vous répondre...',
  'Dans quelques secondes un de nos experts va pouvoir vous répondre...',
];

const getRandomElement = list => list[Math.floor(Math.random() * Math.floor(list.length))];

const logger = Logger('IadvizeAdapter');

class IadvizeAdapter extends WebAdapter {
  constructor(bot) {
    super(bot);
    this.closeSettings = getCloseConversationSettings(bot.config.adapter);
    this.delayBetweenMessages = bot.config.adapter.delayBetweenMessages || DELAY_BETWEEN_MESSAGES;
    this.handleTransfer = this.handleTransfer.bind(this);
    this.handleCloseConversation = this.handleCloseConversation.bind(this);
  }

  async handleTransfer(res, conversationId, idOperator, operator) {
    const { awaitDuration, failureMessage, distributionRules } = await this.bot.brain.userGet(conversationId, 'transfer');
    logger.debug(`
    handleTransfer: conversationId=${conversationId} idOperator=${idOperator} operator=${JSON.stringify(operator)}
    awaitDuration=${awaitDuration} failureMessage=${failureMessage} distributionRules=${JSON.stringify(distributionRules)}
    `);

    const replies = [];
    // Handle transfer failure if there is no distributionRuleId to transfer to
    if ((!distributionRules || distributionRules.length === 0)) {
      logger.debug('handleTransfer: no distribution rules, return await action and failure message');
      // Then add awaitDuration and failure message to replies
      replies.push(
        adaptAwait(awaitDuration),
        adaptText(failureMessage),
      );
      // Unset transfer data
      await this.bot.brain.userSet(conversationId, 'transfer', null);
    } else if (distributionRules.length === 1) {
      logger.debug(`handleTransfer: only one distribution rule, try to transfer to distribution rule ${JSON.stringify(distributionRules[0])}`);
      // Then add awaitDuration and failure message to replies
      replies.push(
        adaptTransfer(distributionRules[0].id),
        adaptAwait(awaitDuration),
        adaptText(failureMessage),
      );
      // Unset transfer data
      await this.bot.brain.userSet(conversationId, 'transfer', null);
    } else {
      // Take the first element from distribution rule ids (and remove it from the rule ids)
      const distributionRule = distributionRules.shift();
      logger.debug(`handleTransfer: many distribution rules, try to transfer to distribution rule ${JSON.stringify(distributionRule)}`);
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

    logger.debug(`handleTransfer: transfer replies=${replies}`);

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
    logger.debug(`handleCloseConversation idOperator=${idOperator} conversationId=${conversationId} close=${JSON.stringify(close)}`);
    const replies = [];
    if (close && close.step) {
      if (close.step === WARNING_STEP) {
        logger.debug(`handleCloseConversation: waiting step, send await (${close.closeWarningDelay} sec) and warning message`);
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
        logger.debug(`handleCloseConversation: close step, send await (${close.closeDelay} sec) and close action`);
        // Unset close conversation step
        await this.bot.brain.userSet(conversationId, 'close', null);
        // Build replies that await and close the conversation
        replies.push(
          adaptAwait(close.closeDelay),
          adaptClose(),
        );
      }
    }

    logger.debug(`handleCloseConversation: close replies=${replies}`);
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

      logger.debug(`[1][route:conversationMessage] idOperator=${idOperator} message=${message} operator=${operator}`);

      // Operator messages are sent to this endpoint too, like visitor messages
      if (message.author.role === 'operator') {
        const transfer = await this.bot.brain.userGet(conversationId, 'transfer');
        logger.debug(`[2][route:conversationMessage] handle operator message, transfer=${JSON.stringify(transfer)}`);
        // If transfer data was saved from the previous step, it means bot has started a transfer
        // and it needs to handle possible transfer failure
        // by awaiting and sending a transfer failure message
        // If the message is sent from operator and is not a transfer request,
        // it means it follows normal replies
        // from the bot, so do not send any reply
        if (transfer) {
          logger.debug('[3][route:conversationMessage] handle operator message, handle transfer');
          return this.handleTransfer(res, conversationId, idOperator, operator);
        }
        logger.debug('[3][route:conversationMessage] handle operator message, no transfer data, handle conversation close');
        // Default case, handle conversation close
        return this.handleCloseConversation(res, idOperator, conversationId);
      }

      // Here role === 'visitor'
      logger.debug('[2][route:conversationMessage] handle visitor message');
      const botMessages = await this.bot.handleMessage(
        this.extendMessage({
          type: 'text',
          user: conversationId,
          payload: {
            value: req.body.message.payload.value,
            options: {
              origin: {
                adapter: 'iadvize',
                referrer: idOperator,
                idWebsite: req.query.idWebsite || null,
              },
            },
          },
        }),
      );

      logger.debug(`[3][route:conversationMessage] handle visitor message, botMessage=${JSON.stringify(botMessages)}`);

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
        logger.debug(`[4][route:conversationMessage] handle visitor message, setup the brain to handle bot close action closeMessage=${JSON.stringify(closeMessage)}`);
        await this.bot.brain.userSet(conversationId, 'close', {
          step: WARNING_STEP,
          closeWarningDelay,
          closeWarningMessage: typeof closeWarningMessage === 'function'
            ? closeWarningMessage(closeDelay)
            : closeWarningMessage,
          closeDelay,
        });
      } else {
        logger.debug(`[4][route:conversationMessage] handle visitor message, setup the brain handle default close action closeSettings=${JSON.stringify(this.closeSettings)}`);
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
        logger.debug(`[5-a][route:conversationMessage] handle visitor message, setup the brain handle transfer action in bot messages transferMessage=${JSON.stringify(transferMessage)}`);
        const {
          awaitDuration,
          failureMessage,
          distributionRuleLabels,
        } = transferMessage.payload.options;
        await this.bot.brain.userSet(conversationId, 'transfer', {
          awaitDuration,
          failureMessage,
          distributionRules: getOperatorTransferRules(operator, distributionRuleLabels),
        });
      }

      // Handle failure now if transfer message is the first one
      if (transferMessageIndex === 0) {
        logger.debug('[5-b][route:conversationMessage] handle visitor message, handle transfer action when it\'s the first message of the bot');
        return this.handleTransfer(res, conversationId, idOperator, operator);
      }

      // Normal case: reply bot messages to the user
      // Note: we filter close message to prevent other messages to be sent
      const filteredMessages = botMessages.filter(m => ['close', 'transfer'].indexOf(m.type) === -1);
      logger.debug('[6][route:conversationMessage] handle visitor message, botMessages to send', filteredMessages);

      return res.send({
        idOperator,
        idConversation: conversationId,
        replies: adaptMessages(filteredMessages, this.delayBetweenMessages),
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }
}

module.exports = IadvizeAdapter;
