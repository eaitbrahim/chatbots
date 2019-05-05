const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.get('/api/jobs', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const host = req.get('host');
      const fullWebApiUrl = `${
        host != 'localhost' ? 'https' : req.protocol
      }://${host}`;
      const jobs = await googleDrive.getJobs(fullWebApiUrl);
      res.json(jobs);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.get('/api/jobs/:jobId', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const jobDetail = await googleDrive.getJobDetail(req.params.jobId);
      res.set('Content-Type', 'text/html');
      res.send(jobDetail);
    } catch (err) {
      console.log('error: ', err);
      res.status(422).send(err);
    }
  });
};
