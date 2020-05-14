'use strict';

const Controller = require('egg').Controller;

class XtransitController extends Controller {
  async getAppSecret() {
    const { ctx, ctx: { service: { mysql } } } = this;
    const { appId } = ctx.request.body;

    const { secret } = await mysql.getAppByAppId(appId);

    ctx.body = { ok: true, data: { secret } };
  }
}

module.exports = XtransitController;
