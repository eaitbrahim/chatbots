const _ = require('lodash');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const keys = require('../config/keys');

class GoogleDrive {
  constructor(spreadsheetKey) {
    this.doc = new GoogleSpreadsheet(keys.jobsSheetId);
  }

  async getJobs() {
    await promisify(this.doc.useServiceAccountAuth)({
      type: keys.type,
      project_id: keys.project_id,
      private_key_id: keys.private_key_id,
      private_key: keys.private_key,
      client_email: keys.client_email,
      client_id: keys.client_id,
      auth_uri: keys.auth_uri,
      token_uri: keys.token_uri,
      auth_provider_x509_cert_url: keys.auth_provider_x509_cert_url,
      client_x509_cert_url: keys.client_x509_cert_url
    });

    const sheetInfo = await promisify(this.doc.getInfo)();
    const sheet = sheetInfo.worksheets[0];
    const rows = await promisify(sheet.getRows)({
      query: 'publish = yes',
      offset: 1,
      limit: 10,
      orderby: 'date'
    });

    const jobs = rows.map(({ id, date, location, imageurl }) => {
      return { id, date, location, imageurl };
    });
    return jobs;
  }
}

module.exports = GoogleDrive;
