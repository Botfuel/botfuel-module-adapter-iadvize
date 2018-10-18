const IadvizeAdapter = require('./build/adapters/iadvize-adapter');
const TransferAction = require('./build/transfer-action');
const CloseAction = require('./build/close-action');

module.exports = {
  botfuelModuleRoot: 'build',
  IadvizeAdapter,
  TransferAction,
  CloseAction,
};
