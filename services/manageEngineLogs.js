const _ = require('lodash');
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

  async getFullname(phonenumber) {
    const queryObj = {
      query: `phonenumber = ${phonenumber.replace(
        '+',
        ''
      )} and action = Create`,
      offset: 1
    };
    console.log('queryObj: ', queryObj);
    var fullname = null;
    await this.setSheet();
    var rows = await promisify(this.sheet.getRows)(queryObj);

    if (rows.length > 0) {
      fullname = _.chain(rows)
        .orderBy(['datetimestamp'], ['desc'])
        .take(10)
        .map(({ fullname }) => {
          return fullname;
        })
        .first()
        .value();

      //fullname = rows[0].fullname;
      console.log('Found name:', fullname);
    }
    return fullname;
  }
}

module.exports = ManageEngineLog;
