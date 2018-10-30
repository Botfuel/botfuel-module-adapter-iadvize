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

var _require2 = require('../utils/iadvize-adapter-utils'),
    adaptText = _require2.adaptText,
    adaptTransfer = _require2.adaptTransfer,
    adaptAwait = _require2.adaptAwait,
    adaptClose = _require2.adaptClose,
    adaptMessage = _require2.adaptMessage,
    getCloseConversationSettings = _require2.getCloseConversationSettings,
    getOperatorTransferRules = _require2.getOperatorTransferRules;

var WARNING_STEP = 'WARNING';
var CLOSE_STEP = 'CLOSE';

var betweenTransferErrorMessage = ['Un spécialiste va vous répondre dans quelques instants...', 'Un de nos experts se libère et va vous répondre...', 'Dans quelques secondes un de nos experts va pouvoir vous répondre...', 'Un spécialiste va vous répondre dans quelques instants...', 'Un de nos experts se libère et va vous répondre...', 'Dans quelques secondes un de nos experts va pouvoir vous répondre...', 'Un spécialiste va vous répondre dans quelques instants...', 'Un de nos experts se libère et va vous répondre...', 'Dans quelques secondes un de nos experts va pouvoir vous répondre...'];

var getRandomElement = function getRandomElement(list) {
  return list[Math.floor(Math.random() * Math.floor(list.length))];
};

var logger = Logger('IadvizeAdapter');

var IadvizeAdapter = function (_WebAdapter) {
  _inherits(IadvizeAdapter, _WebAdapter);

  function IadvizeAdapter(bot) {
    _classCallCheck(this, IadvizeAdapter);

    var _this = _possibleConstructorReturn(this, (IadvizeAdapter.__proto__ || Object.getPrototypeOf(IadvizeAdapter)).call(this, bot));

    _this.closeSettings = getCloseConversationSettings(bot.config.adapter);
    _this.handleTransfer = _this.handleTransfer.bind(_this);
    _this.handleCloseConversation = _this.handleCloseConversation.bind(_this);
    return _this;
  }

  _createClass(IadvizeAdapter, [{
    key: 'handleTransfer',
    value: function () {
      var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(res, conversationId, idOperator, operator) {
        var _ref2, awaitDuration, failureMessage, distributionRules, replies, distributionRule;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.bot.brain.userGet(conversationId, 'transfer');

              case 2:
                _ref2 = _context.sent;
                awaitDuration = _ref2.awaitDuration;
                failureMessage = _ref2.failureMessage;
                distributionRules = _ref2.distributionRules;

                logger.debug('\n    handleTransfer: conversationId=' + conversationId + ' idOperator=' + idOperator + ' operator=' + operator + '\n    awaitDuration=' + awaitDuration + ' failureMessage=' + failureMessage + ' distributionRules=' + distributionRules + '\n    ');

                replies = [];
                // Handle transfer failure if there is no distributionRuleId to transfer to

                if (!(!distributionRules || distributionRules.length === 0)) {
                  _context.next = 15;
                  break;
                }

                logger.debug('handleTransfer: no distribution rules');
                // Then add awaitDuration and failure message to replies
                replies.push(adaptAwait(awaitDuration), adaptText(failureMessage));
                // Unset transfer data
                _context.next = 13;
                return this.bot.brain.userSet(conversationId, 'transfer', null);

              case 13:
                _context.next = 27;
                break;

              case 15:
                if (!(distributionRules.length === 1)) {
                  _context.next = 22;
                  break;
                }

                logger.debug('handleTransfer: only one distribution rule');
                // Then add awaitDuration and failure message to replies
                replies.push(adaptTransfer(distributionRules[0].id), adaptAwait(awaitDuration), adaptText(failureMessage));
                // Unset transfer data
                _context.next = 20;
                return this.bot.brain.userSet(conversationId, 'transfer', null);

              case 20:
                _context.next = 27;
                break;

              case 22:
                logger.debug('handleTransfer: many distribution rules');
                // Take the first element from distribution rule ids (and remove it from the rule ids)
                distributionRule = distributionRules.shift();

                replies.push(adaptTransfer(distributionRule.id), adaptAwait(10), adaptText(getRandomElement(betweenTransferErrorMessage)));
                _context.next = 27;
                return this.bot.brain.userSet(conversationId, 'transfer', {
                  awaitDuration: awaitDuration,
                  failureMessage: failureMessage,
                  distributionRules: distributionRules
                });

              case 27:

                logger.debug('handleTransfer: replies', replies);

                return _context.abrupt('return', res.send({
                  idOperator: idOperator,
                  idConversation: conversationId,
                  replies: replies,
                  variables: [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }));

              case 29:
              case 'end':
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function handleTransfer(_x, _x2, _x3, _x4) {
        return _ref.apply(this, arguments);
      }

      return handleTransfer;
    }()
  }, {
    key: 'handleCloseConversation',
    value: function () {
      var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(res, idOperator, conversationId) {
        var close, replies;
        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                _context2.next = 2;
                return this.bot.brain.userGet(conversationId, 'close');

              case 2:
                close = _context2.sent;

                logger.debug('handleCloseConversation', idOperator, conversationId, close);
                replies = [];

                if (!(close && close.step)) {
                  _context2.next = 16;
                  break;
                }

                if (!(close.step === WARNING_STEP)) {
                  _context2.next = 12;
                  break;
                }

                _context2.next = 9;
                return this.bot.brain.userSet(conversationId, 'close', {
                  step: CLOSE_STEP,
                  closeDelay: close.closeDelay
                });

              case 9:
                // Build replies that await and warn that the conversation will be closed
                replies.push(adaptAwait(close.closeWarningDelay), adaptText(close.closeWarningMessage));
                _context2.next = 16;
                break;

              case 12:
                if (!(close.step === CLOSE_STEP)) {
                  _context2.next = 16;
                  break;
                }

                _context2.next = 15;
                return this.bot.brain.userSet(conversationId, 'close', null);

              case 15:
                // Build replies that await and close the conversation
                replies.push(adaptAwait(close.closeDelay), adaptClose());

              case 16:

                logger.debug('handleCloseConversation: replies', replies);
                // Finally send replies to the user
                return _context2.abrupt('return', res.send({
                  idOperator: idOperator,
                  idConversation: conversationId,
                  replies: replies,
                  variables: [],
                  createdAt: new Date(),
                  updatedAt: new Date()
                }));

              case 18:
              case 'end':
                return _context2.stop();
            }
          }
        }, _callee2, this);
      }));

      function handleCloseConversation(_x5, _x6, _x7) {
        return _ref3.apply(this, arguments);
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
        var _ref4 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res) {
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
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
                  return _context3.stop();
              }
            }
          }, _callee3, _this2);
        }));

        return function (_x8, _x9) {
          return _ref4.apply(this, arguments);
        };
      }());

      app.get('/conversations/:conversationId', function () {
        var _ref5 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee4(req, res) {
          return regeneratorRuntime.wrap(function _callee4$(_context4) {
            while (1) {
              switch (_context4.prev = _context4.next) {
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
                  return _context4.stop();
              }
            }
          }, _callee4, _this2);
        }));

        return function (_x10, _x11) {
          return _ref5.apply(this, arguments);
        };
      }());

      // Bot receives user messages AND bot (operator) messages on this endpoint.
      // This endpoint should return a response containing the bot answers.
      app.post('/conversations/:conversationId/messages', function () {
        var _ref6 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee5(req, res) {
          var conversationId, _req$body, idOperator, message, operator, transfer, botMessages, closeMessageIndex, closeMessage, _closeMessage$payload, closeWarningDelay, closeWarningMessage, closeDelay, transferMessageIndex, transferMessage, filteredMessages;

          return regeneratorRuntime.wrap(function _callee5$(_context5) {
            while (1) {
              switch (_context5.prev = _context5.next) {
                case 0:
                  conversationId = req.params.conversationId;
                  _req$body = req.body, idOperator = _req$body.idOperator, message = _req$body.message, operator = _req$body.operator;
                  _context5.next = 4;
                  return _this2.addUserIfNecessary(conversationId);

                case 4:

                  logger.debug('[route] new message author type:', message.author.role);
                  logger.debug('[route] operator', operator);

                  // Operator messages are sent to this endpoint too, like visitor messages

                  if (!(message.author.role === 'operator')) {
                    _context5.next = 15;
                    break;
                  }

                  _context5.next = 9;
                  return _this2.bot.brain.userGet(conversationId, 'transfer');

                case 9:
                  transfer = _context5.sent;

                  if (!transfer) {
                    _context5.next = 14;
                    break;
                  }

                  return _context5.abrupt('return', _this2.handleTransfer(res, conversationId, idOperator, operator));

                case 14:
                  return _context5.abrupt('return', _this2.handleCloseConversation(res, idOperator, conversationId));

                case 15:
                  _context5.next = 17;
                  return _this2.bot.handleMessage(_this2.extendMessage({
                    type: 'text',
                    user: conversationId,
                    payload: {
                      value: req.body.message.payload.value
                    }
                  }));

                case 17:
                  botMessages = _context5.sent;


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
                    _context5.next = 26;
                    break;
                  }

                  closeMessage = botMessages.find(function (m) {
                    return m.type === 'close';
                  });
                  _closeMessage$payload = closeMessage.payload.options, closeWarningDelay = _closeMessage$payload.closeWarningDelay, closeWarningMessage = _closeMessage$payload.closeWarningMessage, closeDelay = _closeMessage$payload.closeDelay;
                  _context5.next = 24;
                  return _this2.bot.brain.userSet(conversationId, 'close', {
                    step: WARNING_STEP,
                    closeWarningDelay: closeWarningDelay,
                    closeWarningMessage: typeof closeWarningMessage === 'function' ? closeWarningMessage(closeDelay) : closeWarningMessage,
                    closeDelay: closeDelay
                  });

                case 24:
                  _context5.next = 28;
                  break;

                case 26:
                  _context5.next = 28;
                  return _this2.bot.brain.userSet(conversationId, 'close', {
                    step: WARNING_STEP,
                    closeWarningDelay: _this2.closeSettings.closeWarningDelay,
                    closeWarningMessage: _this2.closeSettings.closeWarningMessage,
                    closeDelay: _this2.closeSettings.closeDelay
                  });

                case 28:

                  /**
                   * Handling Transfer action from user
                   */

                  transferMessageIndex = botMessages.findIndex(function (m) {
                    return m.type === 'transfer';
                  });
                  transferMessage = botMessages.find(function (m) {
                    return m.type === 'transfer';
                  });

                  // If there is a transfer message to proceed then save it in the brain

                  if (!transferMessage) {
                    _context5.next = 34;
                    break;
                  }

                  logger.debug('[route] save transfer message data');
                  _context5.next = 34;
                  return _this2.bot.brain.userSet(conversationId, 'transfer', {
                    awaitDuration: transferMessage.payload.options.awaitDuration,
                    failureMessage: transferMessage.payload.options.failureMessage,
                    distributionRules: getOperatorTransferRules(operator, transferMessage.payload.options.distributionRuleLabels)
                  });

                case 34:
                  if (!(transferMessageIndex === 0)) {
                    _context5.next = 37;
                    break;
                  }

                  logger.debug('[route] handleTransfer when the transfer message is first in message list');
                  return _context5.abrupt('return', _this2.handleTransfer(res, conversationId, idOperator, operator));

                case 37:

                  // Normal case: reply bot messages to the user
                  // Note: we filter close message to prevent other messages to be sent
                  filteredMessages = botMessages.filter(function (m) {
                    return ['close', 'transfer'].indexOf(m.type) === -1;
                  });

                  logger.debug('[route] botMessages to send', filteredMessages);

                  return _context5.abrupt('return', res.send({
                    idOperator: idOperator,
                    idConversation: conversationId,
                    replies: filteredMessages.map(adaptMessage),
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }));

                case 40:
                case 'end':
                  return _context5.stop();
              }
            }
          }, _callee5, _this2);
        }));

        return function (_x12, _x13) {
          return _ref6.apply(this, arguments);
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
  }]);

  return IadvizeAdapter;
}(WebAdapter);

module.exports = IadvizeAdapter;