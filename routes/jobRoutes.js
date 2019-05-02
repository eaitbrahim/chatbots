const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.get('/api/jobs', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const jobs = await googleDrive.getJobs();
      console.log('jobs: ', jobs);
      res.send(jobs);
    } catch (err) {
      res.status(422).send(err);
    }
  });
};
