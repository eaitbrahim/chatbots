const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.get('/api/checkCandidature/:messengerId/:jobId', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.candidaturesSheetId);
    try {
      const candidature = await googleDrive.checkCandidature(
        req.params.messengerId,
        req.params.jobId
      );
      res.set('Content-Type', 'application/json');
      res.send(candidature);
    } catch (err) {
      res.status(422).send(err);
    }
  });
};
