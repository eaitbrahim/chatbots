const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.post('/api/checkCandidature', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.candidaturesSheetId);
    try {
      console.log('body:', req.body);
      const { messengerId, jobId, jobTitle } = { ...req.body };
      const candidature = await googleDrive.checkCandidature(
        messengerId,
        jobId,
        jobTitle
      );

      res.json(candidature);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.post('/api/candidature', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.candidaturesSheetId);
    try {
      const result = await googleDrive.submitCandidature(req.body);
      res.json(result);
    } catch (err) {
      console.log('errors:', err);
      res.status(422).send(err);
    }
  });
};
