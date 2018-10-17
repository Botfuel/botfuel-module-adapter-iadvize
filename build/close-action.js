'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('botfuel-dialog'),
    Message = _require.Message;

var _require2 = require('./adapters/iadvize-adapter'),
    DEFAULT_WARNING_DELAY = _require2.DEFAULT_WARNING_DELAY,
    DEFAULT_WARNING_MESSAGE = _require2.DEFAULT_WARNING_MESSAGE,
    DEFAULT_CLOSE_DELAY = _require2.DEFAULT_CLOSE_DELAY;

module.exports = function (_Message) {
  _inherits(CloseAction, _Message);

  function CloseAction(_ref) {
    var _ref$closeWarningDela = _ref.closeWarningDelay,
        closeWarningDelay = _ref$closeWarningDela === undefined ? DEFAULT_WARNING_DELAY : _ref$closeWarningDela,
        _ref$closeWarningMess = _ref.closeWarningMessage,
        closeWarningMessage = _ref$closeWarningMess === undefined ? DEFAULT_WARNING_MESSAGE : _ref$closeWarningMess,
        _ref$closeDelay = _ref.closeDelay,
        closeDelay = _ref$closeDelay === undefined ? DEFAULT_CLOSE_DELAY : _ref$closeDelay;

    _classCallCheck(this, CloseAction);

    return _possibleConstructorReturn(this, (CloseAction.__proto__ || Object.getPrototypeOf(CloseAction)).call(this, 'close', 'bot', null, {
      closeWarningDelay: closeWarningDelay,
      closeWarningMessage: closeWarningMessage,
      closeDelay: closeDelay
    }));
  }

  return CloseAction;
}(Message);