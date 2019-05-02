const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../config/client_secret.json');
const noJobs = require('./jsonResponses/noJobs.json');

class GoogleDrive {
  constructor(spreadsheetKey) {
    this.doc = new GoogleSpreadsheet(spreadsheetKey);
  }

  async fetchData(queryObj) {
    await promisify(this.doc.useServiceAccountAuth)(creds);
    const sheetInfo = await promisify(this.doc.getInfo)();
    const sheet = sheetInfo.worksheets[0];

    return await promisify(sheet.getRows)(queryObj);
  }

  async getJobs() {
    const queryObj = {
      query: 'publish = yes',
      offset: 1,
      limit: 10,
      orderby: 'date'
    };
    const rows = await this.fetchData(queryObj);
    console.log('rows', rows);
    if (rows.length == 0) {
      return noJobs;
    }
    const jobs = rows.map(({ id, date, location, imageurl }) => {
      return { id, date, location, imageurl };
    });
    return jobs;
  }

  async getJobDetail(jobId) {
    const queryObj = {
      query: `id = ${jobId}`,
      offset: 1,
      limit: 1
    };
    const rows = await this.fetchData(queryObj);

    const jobDetail = rows.map(({ title, position, requiredprofile }) => {
      return { title, position, requiredprofile };
    });

    return jobDetail;
  }
}

module.exports = GoogleDrive;
