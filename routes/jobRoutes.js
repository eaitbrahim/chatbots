const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');
const noJobDetail = require('../services/htmlResponses/noJobDetail');

module.exports = app => {
  app.get('/api/jobs', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const fullWebApiUrl = `${req.protocol}://${req.get('host')}`;
      const jobs = await googleDrive.getJobs(fullWebApiUrl);
      res.send(jobs);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.get('/api/jobs/:jobId', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.jobsSheetId);
    try {
      const jobDetail = await googleDrive.getJobDetail(req.params.jobId);

      if (jobDetail.length == 0 || jobDetail[0].title == '') {
        res.set('Content-Type', 'text/html');
        res.send(Buffer.from(noJobDetail));
      } else {
        res.send(jobDetail);
      }
    } catch (err) {
      console.log('error: ', err);
      res.status(422).send(err);
    }
  });
};
