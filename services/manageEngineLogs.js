const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../config/client_secret.json');

class ManageEngineLog {
  constructor(spreadsheetKey) {
    this.doc = new GoogleSpreadsheet(spreadsheetKey);
  }

  async setSheet(worksheet = 0) {
    await promisify(this.doc.useServiceAccountAuth)(creds);
    const sheetInfo = await promisify(this.doc.getInfo)();
    this.sheet = sheetInfo.worksheets[worksheet];
  }

  async submitLog(log) {
    await this.setSheet();

    const row = {
      fullname: log.fullname,
      phonenumber: log.phonenumber,
      action: log.action,
      data: log.data,
      datetimestamp: new Date().toString()
    };

    await promisify(this.sheet.addRow)(row);
  }
}

module.exports = ManageEngineLog;
