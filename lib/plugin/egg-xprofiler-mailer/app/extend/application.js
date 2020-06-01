'use strict';

const nodemailer = require('nodemailer');

const MAILER = Symbol('XPROFILER::MAILER');
const CREATE_MAILER_CLIENT = Symbol('XPROFILER::CREATE_MAILER_CLIENT');

module.exports = {
  [CREATE_MAILER_CLIENT](config = {}) {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port || 25,
      secure: config.secure || false,
      auth: {
        user: config.auth.user,
        pass: config.auth.pass,
      },
    });
    return transporter;
  },

  get mailer() {
    if (!this[MAILER]) {
      const { mailer } = this.config;
      this[MAILER] = this[CREATE_MAILER_CLIENT](mailer);
    }
    return this[MAILER];
  },
};
