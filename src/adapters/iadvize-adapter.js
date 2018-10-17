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

const DEFAULT_CLOSE_DELAY = 30; // seconds
const DEFAULT_WARNING_DELAY = 30; // seconds
const DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';

const WARNING_STEP = 'WARNING';
const CLOSE_STEP = 'CLOSE';

const logger = Logger('IadvizeAdapter');

class IadvizeAdapter extends WebAdapter {
  constructor(bot) {
    super(bot);
    this.closeSettings = this.getCloseConversationSettings(bot.config.adapter);
    this.adaptMessage = this.adaptMessage.bind(this);
    this.handleCloseConversation = this.handleCloseConversation.bind(this);
  }

  adaptText(message) {
    return {
      type: 'message',
      payload: {
        contentType: 'text',
        value: message.payload.value,
      },
      quickReplies: [],
    };
  }

  adaptAwait(duration) {
    return {
      type: 'await',
      duration: {
        unit: 'seconds',
        value: duration,
      },
    }
  }

  adaptTransfer(message) {
    return {
      type: 'transfer',
      distributionRule: message.payload.options.distributionRuleId,
    };
  }

  adaptClose() {
    return {
      type: 'close',
    };
  }

  adaptQuickreplies(message) {
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
  }

  adaptMessage(message) {
    logger.debug('adaptMessage', message);
    switch (message.type) {
      case 'text':
        return this.adaptText(message);
      case 'quickreplies':
        return this.adaptQuickreplies(message);
      case 'transfer':
        return this.adaptTransfer(message);
      case 'close':
        return this.adaptClose();
      default:
        throw new Error(
          `Message of type ${message.type} are not supported by this adapter.`
        );
    }
  }

  handleTransferFailure({
    res,
    transferMessage,
    idOperator,
    conversationId,
    awaitDuration,
    failureMessage,
  }) {
    logger.debug('handleTransferFailure', transferMessage, idOperator, conversationId, awaitDuration, failureMessage);
    const failureHandlingMessage = [
      this.adaptAwait(awaitDuration),
      this.adaptText({
        payload: {
          value: failureMessage,
        },
      }),
    ];

    const replies = !!transferMessage
      ? [transferMessage, ...failureHandlingMessage]
      : failureHandlingMessage;

    return res.send({
      idOperator: idOperator,
      idConversation: conversationId,
      replies,
      variables: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  async handleCloseConversation(res, idOperator, conversationId) {
    const close = await this.bot.brain.userGet(conversationId, 'close');
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
          this.adaptAwait(close.closeWarningDelay),
          this.adaptText({
            payload: {
              value: close.closeWarningMessage,
            },
          }),
        );
      } else if (close.step === CLOSE_STEP) {
        // Unset close conversation step
        await this.bot.brain.userSet(conversationId, 'close', null);
        // Build replies that await and close the conversation
        replies.push(
          this.adaptAwait(close.closeDelay),
          this.adaptClose(),
        );
      }
    }

    // Finally send replies to the user
    return res.send({
      idOperator: idOperator,
      idConversation: conversationId,
      replies: replies,
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
      const { idOperator } = req.body;
      await this.addUserIfNecessary(conversationId);

      // Operator messages are sent to this endpoint too, like visitor messages
      if (req.body.message.author.role === 'operator') {
        const transferData = await this.bot.brain.userGet(conversationId, 'transfer');

        // If transfer data was saved from the previous step, it means bot has started a transfer
        // and it needs to handle possible transfer failure
        // by awaiting and sending a transfer failure message
        // If the message is sent from operator and is not a transfer request, it means it follows normal replies
        // from the bot, so do not send any reply
        if (transferData) {
          await this.bot.brain.userSet(conversationId, 'transfer', null);
          return this.handleTransferFailure({
            res,
            idOperator,
            conversationId: conversationId,
            awaitDuration: transferData.await,
            failureMessage: transferData.failureMessage,
          });
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
       * Handling Transfer action from user
       */

      const transferMessageIndex = botMessages.findIndex(m => m.type === 'transfer');
      const transferMessage = botMessages.find(m => m.type === 'transfer');

      // Handle failure now if transfer message is the first one
      if (transferMessageIndex === 0) {
        return this.handleTransferFailure({
          res,
          transferMessage: botMessages.map(this.adaptMessage)[0],
          idOperator: req.body.idOperator,
          conversationId: conversationId,
          awaitDuration: transferMessage.payload.options.awaitDuration,
          failureMessage: transferMessage.payload.options.failureMessage,
        });
      }

      // If botMessages contains a transfer message and it's not the first message, save in the brain
      // the fact that we have to handle transfer message failure on next bot message
      if (transferMessageIndex > 0) {
        await this.bot.brain.userSet(conversationId, 'transfer', {
          await: transferMessage.payload.options.awaitDuration,
          failureMessage: transferMessage.payload.options.failureMessage,
        });
      }

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

      // Normal case: reply bot messages to the user
      // Note: we filter close message to prevent other messages to be sent
      const filteredMessages = botMessages.filter(m => m.type !== 'close');
      return res.send({
        idOperator: req.body.idOperator,
        idConversation: conversationId,
        replies: filteredMessages.map(this.adaptMessage),
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

  getCloseConversationSettings(params) {
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
  }
}

module.exports = {
  IadvizeAdapter,
  DEFAULT_WARNING_DELAY,
  DEFAULT_WARNING_MESSAGE,
  DEFAULT_CLOSE_DELAY,
};
