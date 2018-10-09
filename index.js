const IadvizeAdapter = require('./build/adapters/iadvize-adapter');
const TransferAction = require('./build/transfer-action');
const StopAction = require('./build/stop-action');

module.exports = {
  botfuelModuleRoot: 'build',
  IadvizeAdapter,
  TransferAction,
  StopAction,
};
