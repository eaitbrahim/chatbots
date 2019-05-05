const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

getJobs = async (host, forModification = false) => {
  const googleDrive = new GoogleDrive(keys.jobsSheetId);
  const fullWebApiUrl = `${
    host.includes('localhost') ? 'http' : 'https'
  }://${host}`;
  return await googleDrive.getJobs(fullWebApiUrl, forModification);
};

module.exports = app => {
  app.get('/api/jobs/toApplyfor', async (req, res) => {
    try {
      const jobs = await getJobs(req.get('host'));
      res.json(jobs);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.get('/api/jobs/forModification', async (req, res) => {
    try {
      const jobs = await getJobs(req.get('host'), true);
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
