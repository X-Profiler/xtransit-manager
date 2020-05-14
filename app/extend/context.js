'use strict';

module.exports = {
  authFailed(code, message) {
    // const { app } = this;
    // if (app.isAjax(this.headers)) {
    //   this.body = { ok: false, message, code };
    // } else {
    //   this.redirect(`/${code}`);
    // }
    this.body = { ok: false, message, code };
  },

  checkPossibleParams(keys) {
    const query = this.query;
    const body = this.request.body;

    for (const key of keys) {
      if (query[key] === undefined && body[key] === undefined) {
        this.authFailed(400, '缺少参数');
        return false;
      }
    }
    return true;
  },
};
