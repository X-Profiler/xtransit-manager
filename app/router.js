'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, config: { secure } } = app;
  const {
    checkSign,
  } = app.middleware.security(secure, app);
  const {
    checkParams,
  } = app.middleware.params({}, app);

  // xprofiler-console
  router.post('/xprofiler/client', checkSign, checkParams(['appId']), 'xprofiler.getClient');
  router.post('/xprofiler/clients', checkSign, checkParams(['appId']), 'xprofiler.getClients');
  router.post('/xprofiler/files', checkSign, checkParams(['appId', 'agentId', 'type']), 'xprofiler.getFiles');
  router.post('/xprofiler/errors', checkSign, checkParams(['appId', 'agentId', 'errorFile', 'currentPage', 'pageSize']), 'xprofiler.getErrors');
  router.post('/xprofiler/modules', checkSign, checkParams(['appId', 'agentId', 'moduleFile']), 'xprofiler.getModules');
  // commands
  router.post('/xprofiler/agent_osinfo', checkSign, checkParams(['appId', 'agentId']), 'xprofiler.getAgentOsInfo');
  router.post('/xprofiler/agent_node_processes', checkSign, checkParams(['appId', 'agentId']), 'xprofiler.getAgentNodeProcesses');
  router.post('/xprofiler/check_process_status', checkSign, checkParams(['appId', 'agentId', 'pid']), 'xprofiler.checkProcessStatus');
  router.post('/xprofiler/check_processes_alive', checkSign, checkParams(['appId', 'agentId', 'pids']), 'xprofiler.checkProcessesAlive');
  router.post('/xprofiler/check_file_status', checkSign, checkParams(['appId', 'agentId', 'filePath']), 'xprofiler.checkFileStatus');
  router.post('/xprofiler/take_action', checkSign, checkParams(['appId', 'agentId', 'pid', 'command', 'options']), 'xprofiler.takeAction');
  router.post('/xprofiler/transfer_file', checkSign, checkParams(['appId', 'agentId', 'fileId', 'fileType', 'filePath', 'server', 'token']), 'xprofiler.transferFile');

  // xtransit-server
  router.post('/xtransit/app_secret', checkSign, checkParams(['appId']), 'xtransit.getAppSecret');
  router.post('/xtransit/update_client', checkSign, checkParams(['appId', 'agentId', 'clientId', 'server', 'timestamp']), 'xtransit.updateClient');
  router.post('/xtransit/remove_client', checkSign, checkParams(['appId', 'agentId', 'clientId']), 'xtransit.removeClient');
  router.post('/xtransit/log', checkSign, checkParams(['appId', 'agentId', 'log']), 'xtransit.handleLog');
  router.post('/xtransit/update_action_status', checkSign, checkParams(['appId', 'agentId', 'filePath']), 'xtransit.updateActionStatus');
};
