const _ = require('lodash');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../config/client_secret.json');
const noJobs = require('./jsonResponses/noJobs.json');
const jobsGallery = require('./jsonResponses/jobsGallery.json');
const neverAppliedToUnkownJob = require('./jsonResponses/neverAppliedToUnkownJob.json');
const neverAppliedToKownJob = require('./jsonResponses/neverAppliedToKownJob.json');
const alreadyAppliedForTheJob = require('./jsonResponses/alreadyAppliedForTheJob.json');
const jobDetailTemplate = require('./htmlResponses/jobDetailTemplate');

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

  async getJobs(fullWebApiUrl, forModification = false) {
    const queryObj = {
      query: 'publish = yes',
      offset: 1
    };
    const rows = await this.fetchData(queryObj);

    if (rows.length == 0) {
      return noJobs;
    }
    const jobs = _.chain(rows)
      .orderBy(['date'], ['desc'])
      .take(10)
      .map(({ id, title, date, location, imageurl }) => {
        const constructedUrl = `${fullWebApiUrl}/api/jobs/${id}`;
        const constructedButtons = this.constructButtons(
          constructedUrl,
          id,
          title,
          forModification
        );

        return {
          title,
          image_url: imageurl,
          subtitle: location + ' - ' + date,
          buttons: constructedButtons
        };
      })
      .value();

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

  async checkCandidature(messengerId, jobId) {
    const queryObj = {
      query: `messengerid = ${messengerId}`,
      offset: 1
    };
    const rows = await this.fetchData(queryObj);
    const filteredRows = _.filter(rows, ({ jobid }) => {
      return jobid == jobId;
    });

    if (filteredRows.length == 0) {
      if (jobId == 1) {
        return neverAppliedToUnkownJob;
      }
      return neverAppliedToKownJob;
    }

    if (jobId == 1) {
      alreadyAppliedForTheJob.messages[0].text =
        'Vous nous avez déjà envoyé votre CV. Souhaitez-vous modifier votre candidature?';
    } else {
      alreadyAppliedForTheJob.messages[0].text = `Vous avez déjà postulé à ce poste: ${
        filteredRows[0].jobtitle
      }. Souhaitez-vous modifier votre candidature?`;
    }

    alreadyAppliedForTheJob.messages[0].quick_replies[0].set_attributes = {
      email: filteredRows[0].email,
      phone: filteredRows[0].phone,
      experience: filteredRows[0].yearsofexperience,
      same_experience: filteredRows[0].similarexperience,
      worked_in_majorel: filteredRows[0].workedatmajorel,
      city: filteredRows[0].location,
      english: filteredRows[0].englishlevel,
      irish: filteredRows[0].dutchlevel,
      spanish: filteredRows[0].spanishlevel,
      italian: filteredRows[0].italianlevel,
      german: filteredRows[0].germanlevel,
      language1: filteredRows[0].language1,
      language1_level: filteredRows[0].language2level,
      language2: filteredRows[0].language2,
      language2_level: filteredRows[0].language2level,
      language3: filteredRows[0].language3,
      language3_level: filteredRows[0].language3level,
      cv: filteredRows[0].cv,
      motivations: filteredRows[0].motivations,
      expectations: filteredRows[0].expectations,
      journey: filteredRows[0].journey,
      job: filteredRows[0].jobid,
      job_title: filteredRows[0].jobtitle,
      first_name: filteredRows[0].firstname,
      last_name: filteredRows[0].lastname
    };

    return alreadyAppliedForTheJob;
  }

  constructButtons(constructedUrl, jobId, jobTitle, forModification) {
    const buttons = [];
    buttons.push({
      type: 'web_url',
      url: constructedUrl,
      title: 'Voir Détail',
      messenger_extensions: true,
      webview_height_ration: 'full'
    });
    if (forModification) {
      buttons.push({
        type: 'show_block',
        set_attributes: {
          job: jobId,
          job_title: jobTitle
        },
        block_names: ['User Info'],
        title: 'Postuler'
      });
      buttons.push({
        type: 'element_share',
        title: 'Partager'
      });
    } else {
      buttons.push({
        type: 'show_block',
        set_attributes: {
          job: jobId,
          job_title: jobTitle
        },
        block_names: ['Recapitulative'],
        title: 'Sélectionner'
      });
    }
    return buttons;
  }
}

module.exports = GoogleDrive;
