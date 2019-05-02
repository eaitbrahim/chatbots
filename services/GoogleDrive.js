const _ = require('lodash');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const keys = require('../config/keys');

class GoogleDrive {
  constructor(spreadsheetKey) {
    this.doc = new GoogleSpreadsheet(spreadsheetKey);
  }

  async getJobs() {
    await promisify(this.doc.useServiceAccountAuth)(keys.googleSheetsCredsJson);

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

  async getJobDetail(jobId) {
    await promisify(this.doc.useServiceAccountAuth)(keys.googleSheetsCredsJson);

    const sheetInfo = await promisify(this.doc.getInfo)();
    const sheet = sheetInfo.worksheets[0];
    const rows = await promisify(sheet.getRows)({
      query: `id = ${jobId}`,
      offset: 1,
      limit: 1
    });

    const jobDetail = rows.map(({ title, position, requiredprofile }) => {
      return { title, position, requiredprofile };
    });
    return jobDetail;
  }
}

module.exports = GoogleDrive;
