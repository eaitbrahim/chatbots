const _ = require('lodash');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../config/client_secret.json');
const messages = require('./jsonResponses/messages.json');
const jobsGallery = require('./jsonResponses/jobsGallery.json');
const redirectToBlocks = require('./jsonResponses/redirectToBlocks.json');
const alreadyAppliedForTheJob = require('./jsonResponses/alreadyAppliedForTheJob.json');
const jobDetailTemplate = require('./htmlResponses/jobDetailTemplate');

class GoogleDrive {
  constructor(spreadsheetKey) {
    this.doc = new GoogleSpreadsheet(spreadsheetKey);
  }

  async setSheet(worksheet = 0) {
    await promisify(this.doc.useServiceAccountAuth)(creds);
    const sheetInfo = await promisify(this.doc.getInfo)();
    this.sheet = sheetInfo.worksheets[worksheet];
  }

  async getJobs(fullWebApiUrl, forModification = false) {
    const queryObj = {
      query: 'publish = yes',
      offset: 1
    };
    await this.setSheet();
    const rows = await promisify(this.sheet.getRows)(queryObj);

    if (rows.length == 0) {
      return (messages.messages[0].text =
        "Désolé, pas d'emplois disponibles pour le moment! S'il vous plaît revenir plus tard.");
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
    await this.setSheet();
    const rows = await promisify(this.sheet.getRows)(queryObj);

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
    const candidature = await this.fetchCandidature(messengerId, jobId);

    if (candidature.length == 0) {
      if (jobId == 1) {
        return redirectToBlocks.redirect_to_blocks.push('Unkown Job');
      }
      return redirectToBlocks.redirect_to_blocks.push('Known Job');
    }

    if (jobId == 1) {
      alreadyAppliedForTheJob.messages[0].text =
        'Vous nous avez déjà envoyé votre CV. Souhaitez-vous modifier votre candidature?';
    } else {
      alreadyAppliedForTheJob.messages[0].text = `Vous avez déjà postulé à ce poste: ${
        candidature[0].jobtitle
      }. Souhaitez-vous modifier votre candidature?`;
    }

    alreadyAppliedForTheJob.messages[0].quick_replies[0].set_attributes = {
      email: candidature[0].email,
      phone: candidature[0].phone,
      experience: candidature[0].yearsofexperience,
      same_experience: candidature[0].similarexperience,
      worked_in_majorel: candidature[0].workedatmajorel,
      city_of_residence: candidature[0].city,
      country_of_residence: candidature[0].country,
      english: candidature[0].englishlevel,
      irish: candidature[0].dutchlevel,
      spanish: candidature[0].spanishlevel,
      italian: candidature[0].italianlevel,
      german: candidature[0].germanlevel,
      language1: candidature[0].language1,
      language1_level: candidature[0].language1level,
      language2: candidature[0].language2,
      language2_level: candidature[0].language2level,
      language3: candidature[0].language3,
      language3_level: candidature[0].language3level,
      cv: candidature[0].cv,
      motivations: candidature[0].motivations,
      expectations: candidature[0].expectations,
      journey: candidature[0].journey,
      job: candidature[0].jobid,
      job_title: candidature[0].jobtitle,
      first_name: candidature[0].firstname,
      last_name: candidature[0].lastname
    };

    return alreadyAppliedForTheJob;
  }

  async submitCandidature(candidature) {
    const fetchedCandidature = await this.fetchCandidature(
      candidature['messenger user id'],
      candidature['job']
    );

    const row = {
      messengerId: candidature['messenger user id'],
      email: candidature.email,
      phone: candidature.phone,
      yearsofexperience: candidature.experience,
      similarexperience: candidature.same_experience,
      workedatmajorel: candidature.worked_in_majorel,
      city: candidature.city_of_residence,
      country: candidature.country_of_residence,
      englishlevel: candidature.english,
      dutchlevel: candidature.irish,
      spanishlevel: candidature.spanish,
      italianlevel: candidature.italian,
      germanlevel: candidature.german,
      language1: candidature.language1,
      language1level: candidature.language1_level,
      language2: candidature.language2,
      language2level: candidature.language2_level,
      language3: candidature.language3,
      language3level: candidature.language3_level,
      cv: candidature.cv,
      motivations: candidature.motivations,
      expectations: candidature.expectations,
      journey: candidature.journey,
      jobid: candidature.job,
      jobtitle: candidature.job_title,
      firstname: candidature.first_name,
      lastname: candidature.last_name,
      submissiondate: new Date().toString()
    };

    messages.messages[0].text =
      'Votre candidature a été ajoutée à notre base de données.';
    if (fetchedCandidature.length != 0) {
      messages.messages[0].text =
        'Votre candidature a été mise à jour dans notre base de données.';
      fetchedCandidature[0].del();
    }

    await promisify(this.sheet.addRow)(row);

    return messages;
  }

  async submitRating(rating) {
    const ratingDoesExist = await this.ratingAlreadySubmitted(
      rating['messenger user id']
    );

    if (ratingDoesExist) {
      redirectToBlocks.redirect_to_blocks = ['Main Menu'];
      return redirectToBlocks;
    }

    const row = {
      messengerId: rating['messenger user id'],
      firstname: rating.first_name,
      lastname: rating.last_name,
      rating: rating.rating_experience,
      reason: rating.rating_reason,
      submissiondate: new Date().toString()
    };

    await promisify(this.sheet.addRow)(row);
  }

  async checkRatingExistence(messengerId) {
    if (await this.ratingAlreadySubmitted(messengerId)) {
      redirectToBlocks.redirect_to_blocks = ['Main Menu'];
    } else {
      redirectToBlocks.redirect_to_blocks = ['Feedback Form'];
    }

    return redirectToBlocks;
  }

  async ratingAlreadySubmitted(messengerId) {
    const queryObj = {
      query: `messengerid = ${messengerId}`,
      offset: 1
    };
    await this.setSheet(1);
    const rows = await promisify(this.sheet.getRows)(queryObj);

    return rows.length > 0 || false;
  }

  async fetchCandidature(messengerId, jobId) {
    const queryObj = {
      query: `messengerid = ${messengerId}`,
      offset: 1
    };
    await this.setSheet();
    const rows = await promisify(this.sheet.getRows)(queryObj);
    const filteredRows = _.filter(rows, ({ jobid }) => {
      return jobid == jobId;
    });
    return filteredRows;
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
    if (!forModification) {
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
