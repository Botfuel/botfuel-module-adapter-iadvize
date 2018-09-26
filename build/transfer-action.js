'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('botfuel-dialog'),
    Message = _require.Message;

module.exports = function (_Message) {
  _inherits(TransferAction, _Message);

  function TransferAction(_ref) {
    var distributionRuleId = _ref.distributionRuleId,
        _ref$failureMessage = _ref.failureMessage,
        failureMessage = _ref$failureMessage === undefined ? 'Le transfert a échoué.' : _ref$failureMessage,
        _ref$awaitDuration = _ref.awaitDuration,
        awaitDuration = _ref$awaitDuration === undefined ? 30 : _ref$awaitDuration;

    _classCallCheck(this, TransferAction);

    return _possibleConstructorReturn(this, (TransferAction.__proto__ || Object.getPrototypeOf(TransferAction)).call(this, 'transfer', 'bot', null, {
      distributionRuleId: distributionRuleId,
      failureMessage: failureMessage,
      awaitDuration: awaitDuration
    }));
  }

  return TransferAction;
}(Message);