'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _require = require('botfuel-dialog'),
    Message = _require.Message;

module.exports = function (_Message) {
  _inherits(TransferAction, _Message);

  function TransferAction(_ref) {
    var distributionRuleLabels = _ref.distributionRuleLabels,
        _ref$failureMessage = _ref.failureMessage,
        failureMessage = _ref$failureMessage === undefined ? 'Le transfert a échoué.' : _ref$failureMessage,
        _ref$awaitDuration = _ref.awaitDuration,
        awaitDuration = _ref$awaitDuration === undefined ? 30 : _ref$awaitDuration;

    _classCallCheck(this, TransferAction);

    var _this = _possibleConstructorReturn(this, (TransferAction.__proto__ || Object.getPrototypeOf(TransferAction)).call(this, 'transfer', 'bot', null, {
      distributionRuleLabels: distributionRuleLabels,
      failureMessage: failureMessage,
      awaitDuration: awaitDuration
    }));

    _this.validateArray('distributionRuleLabels', distributionRuleLabels);
    return _this;
  }

  _createClass(TransferAction, [{
    key: 'validate',
    value: function validate() {
      _get(TransferAction.prototype.__proto__ || Object.getPrototypeOf(TransferAction.prototype), 'validate', this).call(this);
      this.validateArray('distributionRuleLabels', this.payload.options.distributionRuleLabels);
    }
  }]);

  return TransferAction;
}(Message);