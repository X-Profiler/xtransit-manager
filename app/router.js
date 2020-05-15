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

  router.post('/xtransit/app_secret', checkSign, checkParams(['appId']), 'xtransit.getAppSecret');
  router.post('/xtransit/update_client', checkSign,
    checkParams(['appId', 'agentId', 'clientId', 'server', 'timestamp']), 'xtransit.updateClient');
  router.post('/xtransit/remove_client', checkSign,
    checkParams(['appId', 'agentId', 'clientId']), 'xtransit.removeClient');
};
