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
    WebAdapter = _require.WebAdapter;

var IadvizeAdapter = function (_WebAdapter) {
  _inherits(IadvizeAdapter, _WebAdapter);

  function IadvizeAdapter(parameters) {
    _classCallCheck(this, IadvizeAdapter);

    var _this = _possibleConstructorReturn(this, (IadvizeAdapter.__proto__ || Object.getPrototypeOf(IadvizeAdapter)).call(this, parameters));

    _this.adaptMessage = _this.adaptMessage.bind(_this);
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
    key: 'adaptTransfer',
    value: function adaptTransfer(message) {
      return {
        type: 'transfer',
        distributionRule: message.payload.options.distributionRuleId
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
      switch (message.type) {
        case 'text':
          return this.adaptText(message);
        case 'quickreplies':
          return this.adaptQuickreplies(message);
        case 'transfer':
          return this.adaptTransfer(message);
        default:
          throw new Error('Message of type ' + message.type + ' are not supported by this adapter.');
      }
    }
  }, {
    key: 'createRoutes',
    value: function createRoutes(app) {
      var _this2 = this;

      // Conversation initialization. This is done when the first user message is sent
      // We don't do much here.
      app.post('/conversations', function () {
        var _ref = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee(req, res) {
          return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
              switch (_context.prev = _context.next) {
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
                  return _context.stop();
              }
            }
          }, _callee, _this2);
        }));

        return function (_x, _x2) {
          return _ref.apply(this, arguments);
        };
      }());

      // Doesn't seem to be used... Should be used to retreive messages from a conversation?
      app.get('/conversations/:conversationId/messages', function () {
        var _ref2 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee2(req, res) {
          return regeneratorRuntime.wrap(function _callee2$(_context2) {
            while (1) {
              switch (_context2.prev = _context2.next) {
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
                  return _context2.stop();
              }
            }
          }, _callee2, _this2);
        }));

        return function (_x3, _x4) {
          return _ref2.apply(this, arguments);
        };
      }());

      // Bot receives user messages on this endpoint.
      // This endpoint should return a response containing the bot answers.
      app.post('/conversations/:conversationId/messages', function () {
        var _ref3 = _asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee3(req, res) {
          var botMessages;
          return regeneratorRuntime.wrap(function _callee3$(_context3) {
            while (1) {
              switch (_context3.prev = _context3.next) {
                case 0:
                  _context3.next = 2;
                  return _this2.addUserIfNecessary(req.params.conversationId);

                case 2:
                  if (!(req.body.message.author.role === 'operator')) {
                    _context3.next = 4;
                    break;
                  }

                  return _context3.abrupt('return', res.send({
                    idOperator: req.body.idOperator,
                    idConversation: req.params.conversationId,
                    replies: [],
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }));

                case 4:
                  _context3.next = 6;
                  return _this2.bot.handleMessage(_this2.extendMessage({
                    type: 'text',
                    user: req.params.conversationId,
                    payload: {
                      value: req.body.message.payload.value
                    }
                  }));

                case 6:
                  botMessages = _context3.sent;
                  return _context3.abrupt('return', res.send({
                    idOperator: req.body.idOperator,
                    idConversation: req.params.conversationId,
                    replies: botMessages.map(_this2.adaptMessage),
                    variables: [],
                    createdAt: new Date(),
                    updatedAt: new Date()
                  }));

                case 8:
                case 'end':
                  return _context3.stop();
              }
            }
          }, _callee3, _this2);
        }));

        return function (_x5, _x6) {
          return _ref3.apply(this, arguments);
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