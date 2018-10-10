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

const DEFAULT_CLOSE_DELAY = 300; // 5min in second

const logger = Logger('IadvizeAdapter');

class IadvizeAdapter extends WebAdapter {
  constructor(bot) {
    super(bot);
    this.closeConversationDelay = this.computeCloseConversationDelay(bot); // Should be in second
    this.adaptMessage = this.adaptMessage.bind(this);
    this.buildBotReplies = this.buildBotReplies.bind(this);
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
      {
        type: 'await',
        duration: {
          unit: 'seconds',
          value: awaitDuration,
        },
      },
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

  buildBotReplies(botMessages) {
    logger.debug('buildBotReplies:botMessages', botMessages);
    // Define await message using the delay
    // defined in the configuration or as an environment variable
    const awaitMessage = {
      type: 'await',
      duration: {
        unit: 'seconds',
        value: this.closeConversationDelay,
      },
    };
    // Define the close message
    const closeMessage = {
      type: 'close',
    };
    const closeMessageIndex = botMessages.findIndex(m => m.type === closeMessage.type);
    const replies = botMessages.map(this.adaptMessage);
    // If a stop message is already in bot messages
    // Then insert an await message just before the stop message
    // Else push the await + stop messages at the end of bot messages
    if (closeMessageIndex !== -1) {
      replies.splice(closeMessageIndex, 0, awaitMessage);
    } else {
      replies.push(awaitMessage, closeMessage);
    }

    logger.debug('buildBotReplies:replies', replies);
    console.log('BOT REPLIES', replies);
    return replies;
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
      await this.addUserIfNecessary(req.params.conversationId);

      // Operator messages are sent to this endpoint too, like visitor messages
      if (req.body.message.author.role === 'operator') {
        const transferData = await this.bot.brain.userGet(
          req.params.conversationId,
          'transfer'
        );

        // If transfer data was saved from the previous step, it means bot has started a transfer
        // and it needs to handle possible transfer failure
        // by awaiting and sending a transfer failure message
        // If the message is sent from operator and is not a transfer request, it means it follows normal replies
        // from the bot, so do not send any reply
        if (transferData) {
          await this.bot.brain.userSet(
            req.params.conversationId,
            'transfer',
            null
          );

          return this.handleTransferFailure({
            res,
            idOperator: req.body.idOperator,
            conversationId: req.params.conversationId,
            awaitDuration: transferData.await,
            failureMessage: transferData.failureMessage,
          });
        } else {
          return res.send({
            idOperator: req.body.idOperator,
            idConversation: req.params.conversationId,
            replies: [],
            variables: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      // Here role === 'visitor'

      let botMessages = await this.bot.handleMessage(
        this.extendMessage({
          type: 'text',
          user: req.params.conversationId,
          payload: {
            value: req.body.message.payload.value,
          },
        })
      );

      const transferMessageIndex = botMessages.findIndex(
        message => message.type === 'transfer'
      );

      const transferMessage = botMessages.find(
        message => message.type === 'transfer'
      );

      // Handle failure now if transfer message is the first one
      if (transferMessageIndex === 0) {
        return this.handleTransferFailure({
          res,
          transferMessage: botMessages.map(this.adaptMessage)[0],
          idOperator: req.body.idOperator,
          conversationId: req.params.conversationId,
          awaitDuration: transferMessage.payload.options.awaitDuration,
          failureMessage: transferMessage.payload.options.failureMessage,
        });
      }

      // If botMessages contains a transfer message and it's not the first message, save in the brain
      // the fact that we have to handle transfer message failure on next bot message
      if (transferMessageIndex > 0) {
        await this.bot.brain.userSet(req.params.conversationId, 'transfer', {
          await: transferMessage.payload.options.awaitDuration,
          failureMessage: transferMessage.payload.options.failureMessage,
        });
      }

      // Normal case: reply bot messages to the user
      return res.send({
        idOperator: req.body.idOperator,
        idConversation: req.params.conversationId,
        replies: this.buildBotReplies(botMessages),
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

  computeCloseConversationDelay(bot) {
    logger.debug('computeCloseConversationDelay');
    return process.env.CLOSE_CONVERSATION_DELAY || bot.config.adapter.closeConversationDelay || DEFAULT_CLOSE_DELAY;
  }
}

module.exports = IadvizeAdapter;
