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
  adaptMessage,
  adaptMessages,
  getCloseConversationSettings,
  getOperatorTransferRules,
} = require('../utils/iadvize-adapter-utils');
const CloseAction = require('../close-action');

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
    this.handleTransfer = this.handleTransfer.bind(this);
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

      logger.debug(`[0][route:conversationMessage] idOperator=${idOperator} message=${message} operator=${operator}`);

      /**
       * Message author is visitor
       */
      if (message.author.role === 'visitor') {
        /**
         * STEP 1: computes bot messages from visitor message
         */
        logger.debug('[1][route:conversationMessage] handle visitor message');
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

        logger.debug(`[2][route:conversationMessage] handle visitor message, botMessage=${JSON.stringify(botMessages)}`);

        /**
         * STEP 2: Handle transfer action from bot
         */

        const transferMessageIndex = botMessages.findIndex(m => m.type === 'transfer');
        const transferMessage = botMessages.find(m => m.type === 'transfer');

        // If there is a transfer message to proceed then save it in the brain
        if (transferMessage) {
          logger.debug(`[3][route:conversationMessage] handle visitor message, setup the brain handle transfer action in bot messages transferMessage=${JSON.stringify(transferMessage)}`);
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
          logger.debug('[3-b][route:conversationMessage] handle visitor message, handle transfer action when it\'s the first message of the bot');
          return this.handleTransfer(res, conversationId, idOperator, operator);
        }

        /**
         * STEP 3: handle close conversation
         */

        // Check if the bot send a close action
        // If no then handle default close behavior
        // by adding close warning messages and action to replies
        // If yes then replace close action by relevant messages
        const handleDefaultCloseBehavior = botMessages.findIndex(m => m.type === 'close') !== -1;
        logger.debug('[4][route:conversationMessage] should handle default close behavior', handleDefaultCloseBehavior);
        if (handleDefaultCloseBehavior) {
          // build default close action
          const defaultCloseAction = new CloseAction({
            closeWarningDelay: this.closeSettings.closeWarningDelay,
            closeWarningMessage: this.closeSettings.closeWarningMessage,
            closeDelay: this.closeSettings.closeDelay,
          });
          // push it to bot messages
          botMessages.push(defaultCloseAction);
        }

        /**
         * STEP 4: computes replies to send to the visitor
         */

        // const replies = botMessages.reduce((list, msg) => [...list, ...adaptMessage(msg)], []);
        const replies = adaptMessages(botMessages);
        logger.info('[5][route:conversationMessage] bot replies (adapted bot messages)', replies);

        return res.send({
          idOperator,
          idConversation: conversationId,
          replies,
          variables: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      /**
       * Message author is operator
       */

      const transfer = await this.bot.brain.userGet(conversationId, 'transfer');
      logger.debug(`[1][route:conversationMessage] handle operator message, transfer=${JSON.stringify(transfer)}`);
      // If transfer data was saved from the previous step, it means bot has started a transfer
      // and it needs to handle possible transfer failure
      // by awaiting and sending a transfer failure message
      // If the message is sent from operator and is not a transfer request,
      // it means it follows normal replies
      // from the bot, so do not send any reply
      if (transfer) {
        logger.debug('[1-b][route:conversationMessage] handle operator message, handle transfer');
        return this.handleTransfer(res, conversationId, idOperator, operator);
      }

      logger.debug('[2][route:conversationMessage] handle operator message, no transfer data, return empty replies');
      // Default case return empty list of replies to not override replies sent by the bot
      return res.send({
        idOperator,
        idConversation: conversationId,
        replies: [],
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }
}

module.exports = IadvizeAdapter;
