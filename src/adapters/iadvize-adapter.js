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

const { WebAdapter } = require('botfuel-dialog');

class IadvizeAdapter extends WebAdapter {
  constructor(parameters) {
    super(parameters);

    this.adaptMessage = this.adaptMessage.bind(this);
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
    switch (message.type) {
      case 'text':
        return this.adaptText(message);
      case 'quickreplies':
        return this.adaptQuickreplies(message);
      case 'transfer':
        return this.adaptTransfer(message);
      default:
        throw new Error(
          `Message of type ${message.type} are not supported by this adapter.`
        );
    }
  }

  createRoutes(app) {
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

    // Doesn't seem to be used... Should be used to retreive messages from a conversation?
    app.get('/conversations/:conversationId/messages', async (req, res) => {
      res.send({
        idConversation: req.params.conversationId,
        idOperator: req.query.idOperator,
        replies: [],
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    // Bot receives user messages on this endpoint.
    // This endpoint should return a response containing the bot answers.
    app.post('/conversations/:conversationId/messages', async (req, res) => {
      await this.addUserIfNecessary(req.params.conversationId);

      // If the message is sent from operator, it means it is from the bot, so do not send any reply
      if (req.body.message.author.role === 'operator') {
        return res.send({
          idOperator: req.body.idOperator,
          idConversation: req.params.conversationId,
          replies: [],
          variables: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      let botMessages = await this.bot.handleMessage(
        this.extendMessage({
          type: 'text',
          user: req.params.conversationId,
          payload: {
            value: req.body.message.payload.value,
          },
        })
      );

      return res.send({
        idOperator: req.body.idOperator,
        idConversation: req.params.conversationId,
        replies: botMessages.map(this.adaptMessage),
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
