const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.get('/api/jobs', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const jobs = await googleDrive.getJobs();
      res.send(jobs);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.get('/api/jobs/:jobId', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const jobDetail = await googleDrive.getJobDetail(req.params.jobId);
      res.send(jobDetail);
    } catch (err) {
      console.log('error: ', err);
      res.status(422).send(err);
    }
  });

  app.get('/api/test', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    res.send(googleDrive);
  });
};
