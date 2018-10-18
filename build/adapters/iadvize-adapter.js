'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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

var _require = require('botfuel-dialog'),
    WebAdapter = _require.WebAdapter,
    Logger = _require.Logger;

var DEFAULT_CLOSE_DELAY = 30; // seconds
var DEFAULT_WARNING_DELAY = 30; // seconds
var DEFAULT_WARNING_MESSAGE = 'The conversation will be closed in a few seconds';

var WARNING_STEP = 'WARNING';
var CLOSE_STEP = 'CLOSE';

var logger = Logger('IadvizeAdapter');

var IadvizeAdapter = function (_WebAdapter) {
  _inherits(IadvizeAdapter, _WebAdapter);

  function IadvizeAdapter(bot) {
    _classCallCheck(this, IadvizeAdapter);

    var _this = _possibleConstructorReturn(this, (IadvizeAdapter.__proto__ || Object.getPrototypeOf(IadvizeAdapter)).call(this, bot));

    _this.closeSettings = _this.getCloseConversationSettings(bot.config.adapter);
    _this.adaptMessage = _this.adaptMessage.bind(_this);
    _this.handleCloseConversation = _this.handleCloseConversation.bind(_this);
    return _this;
  }

  _createClass(IadvizeAdapter, [{
    key: 'adaptText',
    value: function adaptText(message) {
      return {
        type: 'message',
        payload: {
          contentType: 'text',
          value: message.payload.value
        },
        quickReplies: []
      };
    }
  }, {
    key: 'adaptAwait',
    value: function adaptAwait(duration) {
      return {
        type: 'await',
        duration: {
          unit: 'seconds',
          value: duration
        }
      };
    }
  }, {
    key: 'adaptTransfer',
    value: function adaptTransfer(message) {
      return {
        type: 'transfer',
        distributionRule: message.payload.options.distributionRuleId
      };
    }
  }, {
    key: 'adaptClose',
    value: function adaptClose() {
      return {
        type: 'close'
      };
    }
  }, {
    key: 'adaptQuickreplies',
    value: function adaptQuickreplies(message) {
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
    }
  }, {
    key: 'adaptMessage',
    value: function adaptMessage(message) {
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
          throw new Error('Message of type ' + message.type + ' are not supported by this adapter.');
      }
    }
  }, {
    key: 'handleTransferFailure',
    value: function handleTransferFailure(_ref) {
      var res = _ref.res,
          transferMessage = _ref.transferMessage,
          idOperator = _ref.idOperator,
          conversationId = _ref.conversationId,
          awaitDuration = _ref.awaitDuration,
          failureMessage = _ref.failureMessage;

      logger.debug('handleTransferFailure', transferMessage, idOperator, conversationId, awaitDuration, failureMessage);
      var failureHandlingMessage = [this.adaptAwait(awaitDuration), this.adaptText({
        payload: {
          value: failureMessage
        }
      })];

      var replies = !!transferMessage ? [transferMessage].concat(failureHandlingMessage) : failureHandlingMessage;

      return res.send({
        idOperator: idOperator,
        idConversation: conversationId,
        replies: replies,
        variables: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }, {
    key: 'handleCloseConversation',
    value: function () {
      var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(res, idOperator, conversationId) {
        var close, replies;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.bot.brain.userGet(conversationId, 'close');

              case 2:
                close = _context.sent;

                logger.debug('handleCloseConversation', idOperator, conversationId, close);
                replies = [];

                if (!(close && close.step)) {
                  _context.next = 16;
                  break;
                }

                if (!(close.step === WARNING_STEP)) {
                  _context.next = 12;
                  break;
                }

                _context.next = 9;
                return this.bot.brain.userSet(conversationId, 'close', {
                  step: CLOSE_STEP,
                  closeDelay: close.closeDelay
                });

              case 9:
                // Build replies that await and warn that the conversation will be closed
                replies.push(this.adaptAwait(close.closeWarningDelay), this.adaptText({
                  payload: {
                    value: close.closeWarningMessage
                  }
                }));
                _context.next = 16;
                break;

              case 12:
                if (!(close.step === CLOSE_STEP)) {
                  _context.next = 16;
                  break;
                }

                _context.next = 15;
                return this.bot.brain.userSet(conversationId, 'close', null);

              case 15:
                // Build replies that await and close the conversation
                replies.push(this.adaptAwait(close.closeDelay), this.adaptClose());

              case 16:

                logger.debug('handleCloseConversation: replies', replies);
                // Finally send replies to the user
                return _context.abrupt('return', res.send({
                  idOperator: idOperator,
                  idConversation: conversationId,
                  replies: replies,
                  variables: [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }));

              case 18:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function handleCloseConversation(_x, _x2, _x3) {
        return _ref2.apply(this, arguments);
      }

      return handleCloseConversation;
    }()
  }, {
    key: 'createRoutes',
    value: function createRoutes(app) {
      var _this2 = this;

      logger.debug('createRoutes');
      // Conversation initialization. This is done when the first user message is sent
      // We don't do much here.
      app.post('/conversations', function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
                case 0:
                  res.send({
                    idOperator: req.body.idOperator,
                    idConversation: req.body.idConversation,
                    replies: [],
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });

                case 1:
                case 'end':
                  return _context2.stop();
              }
            }
          }, _callee2, _this2);
        }));

        return function (_x4, _x5) {
          return _ref3.apply(this, arguments);
        };
      }());

      app.get('/conversations/:conversationId', function () {
        var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res) {
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  res.send({
                    idConversation: req.params.conversationId,
                    idOperator: req.query.idOperator,
                    replies: [],
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  });

                case 1:
                case 'end':
                  return _context3.stop();
              }
            }
          }, _callee3, _this2);
        }));

        return function (_x6, _x7) {
          return _ref4.apply(this, arguments);
        };
      }());

      // Bot receives user messages AND bot (operator) messages on this endpoint.
      // This endpoint should return a response containing the bot answers.
      app.post('/conversations/:conversationId/messages', function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(req, res) {
          var conversationId, idOperator, transferData, botMessages, transferMessageIndex, transferMessage, closeMessageIndex, closeMessage, _closeMessage$payload, closeWarningDelay, closeWarningMessage, closeDelay, filteredMessages;

          return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
                case 0:
                  conversationId = req.params.conversationId;
                  idOperator = req.body.idOperator;
                  _context4.next = 4;
                  return _this2.addUserIfNecessary(conversationId);

                case 4:
                  if (!(req.body.message.author.role === 'operator')) {
                    _context4.next = 15;
                    break;
                  }

                  _context4.next = 7;
                  return _this2.bot.brain.userGet(conversationId, 'transfer');

                case 7:
                  transferData = _context4.sent;

                  if (!transferData) {
                    _context4.next = 14;
                    break;
                  }

                  _context4.next = 11;
                  return _this2.bot.brain.userSet(conversationId, 'transfer', null);

                case 11:
                  return _context4.abrupt('return', _this2.handleTransferFailure({
                    res: res,
                    idOperator: idOperator,
                    conversationId: conversationId,
                    awaitDuration: transferData.await,
                    failureMessage: transferData.failureMessage
                  }));

                case 14:
                  return _context4.abrupt('return', _this2.handleCloseConversation(res, idOperator, conversationId));

                case 15:
                  _context4.next = 17;
                  return _this2.bot.handleMessage(_this2.extendMessage({
                    type: 'text',
                    user: conversationId,
                    payload: {
                      value: req.body.message.payload.value
                    }
                  }));

                case 17:
                  botMessages = _context4.sent;


                  /**
                   * Handling Transfer action from user
                   */

                  transferMessageIndex = botMessages.findIndex(function (m) {
                    return m.type === 'transfer';
                  });
                  transferMessage = botMessages.find(function (m) {
                    return m.type === 'transfer';
                  });

                  // Handle failure now if transfer message is the first one

                  if (!(transferMessageIndex === 0)) {
                    _context4.next = 22;
                    break;
                  }

                  return _context4.abrupt('return', _this2.handleTransferFailure({
                    res: res,
                    transferMessage: botMessages.map(_this2.adaptMessage)[0],
                    idOperator: req.body.idOperator,
                    conversationId: conversationId,
                    awaitDuration: transferMessage.payload.options.awaitDuration,
                    failureMessage: transferMessage.payload.options.failureMessage
                  }));

                case 22:
                  if (!(transferMessageIndex > 0)) {
                    _context4.next = 25;
                    break;
                  }

                  _context4.next = 25;
                  return _this2.bot.brain.userSet(conversationId, 'transfer', {
                    await: transferMessage.payload.options.awaitDuration,
                    failureMessage: transferMessage.payload.options.failureMessage
                  });

                case 25:

                  /**
                   * Handling close action from user
                   */

                  // Look for close message in bot messages
                  // Then Store close options in the brain if close message in the list
                  // Else store adapter close options in the brain
                  closeMessageIndex = botMessages.findIndex(function (m) {
                    return m.type === 'close';
                  });

                  if (!(closeMessageIndex !== -1)) {
                    _context4.next = 33;
                    break;
                  }

                  closeMessage = botMessages.find(function (m) {
                    return m.type === 'close';
                  });
                  _closeMessage$payload = closeMessage.payload.options, closeWarningDelay = _closeMessage$payload.closeWarningDelay, closeWarningMessage = _closeMessage$payload.closeWarningMessage, closeDelay = _closeMessage$payload.closeDelay;
                  _context4.next = 31;
                  return _this2.bot.brain.userSet(conversationId, 'close', {
                    step: WARNING_STEP,
                    closeWarningDelay: closeWarningDelay,
                    closeWarningMessage: typeof closeWarningMessage === 'function' ? closeWarningMessage(closeDelay) : closeWarningMessage,
                    closeDelay: closeDelay
                  });

                case 31:
                  _context4.next = 35;
                  break;

                case 33:
                  _context4.next = 35;
                  return _this2.bot.brain.userSet(conversationId, 'close', {
                    step: WARNING_STEP,
                    closeWarningDelay: _this2.closeSettings.closeWarningDelay,
                    closeWarningMessage: _this2.closeSettings.closeWarningMessage,
                    closeDelay: _this2.closeSettings.closeDelay
                  });

                case 35:

                  // Normal case: reply bot messages to the user
                  // Note: we filter close message to prevent other messages to be sent
                  filteredMessages = botMessages.filter(function (m) {
                    return m.type !== 'close';
                  });

                  logger.debug('botMessages to send', filteredMessages);

                  return _context4.abrupt('return', res.send({
                    idOperator: req.body.idOperator,
                    idConversation: conversationId,
                    replies: filteredMessages.map(_this2.adaptMessage),
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }));

                case 38:
                case 'end':
                  return _context4.stop();
              }
            }
          }, _callee4, _this2);
        }));

        return function (_x8, _x9) {
          return _ref5.apply(this, arguments);
        };
      }());

      // Used by the iAdvize users interface and API to know if the bot is available or not.
      // We implement it at the bot level so if the bot server is not running,
      // the request fails and the bot is set as unavailable.
      app.get('/availability-strategies', function (req, res) {
        res.send([{
          strategy: 'customAvailability',
          availability: true
        }]);
      });
    }
  }, {
    key: 'getCloseConversationSettings',
    value: function getCloseConversationSettings(params) {
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
    }
  }]);

  return IadvizeAdapter;
}(WebAdapter);

module.exports = IadvizeAdapter;