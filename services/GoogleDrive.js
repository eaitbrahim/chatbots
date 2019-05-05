const _ = require('lodash');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../config/client_secret.json');
const noJobs = require('./jsonResponses/noJobs.json');
const jobsGallery = require('./jsonResponses/jobsGallery.json');
const noJobDetailTemplate = require('../services/htmlResponses/noJobDetailTemplate');
const jobDetailTemplate = require('../services/htmlResponses/jobDetailTemplate');

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

  async getJobs(fullWebApiUrl) {
    const queryObj = {
      query: 'publish = yes',
      offset: 1,
      limit: 10,
      orderby: 'date'
    };
    const rows = await this.fetchData(queryObj);

    if (rows.length == 0) {
      return noJobs;
    }

    const jobs = _.map(rows, ({ id, title, date, location, imageurl }) => {
      const buttons = [];
      buttons.push({
        type: 'web_url',
        url: `${fullWebApiUrl}/api/jobs/${id}`,
        title: 'Voir Détail',
        messenger_extensions: true,
        webview_height_ration: 'full'
      });
      buttons.push({
        type: 'show_block',
        set_attributes: {
          job: id,
          job_title: title
        },
        block_names: ['User Info'],
        title: 'Postuler'
      });
      buttons.push({
        type: 'element_share',
        title: 'Partager'
      });
      return {
        title,
        image_url: imageurl,
        subtitle: location + ' - ' + date,
        buttons: buttons
      };
    });

    jobsGallery.messages[0].attachment.payload.elements = jobs;
    return jobsGallery;
  }

  async getJobDetail(jobId) {
    const queryObj = {
      query: `id = ${jobId}`,
      offset: 1,
      limit: 1
    };
    const rows = await this.fetchData(queryObj);

    if (rows.length == 0 || rows[0].title == '') {
      return noJobDetailTemplate;
    }

    const jobDetail = _.map(
      rows,
      ({ title, location, position, requiredprofile }) => {
        return { title, location, position, requiredprofile };
      }
    );

    return jobDetailTemplate(jobDetail[0]);
  }
}

module.exports = GoogleDrive;
