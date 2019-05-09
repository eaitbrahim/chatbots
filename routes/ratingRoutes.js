const GoogleDrive = require('../services/GoogleDrive');
const keys = require('../config/keys');

module.exports = app => {
  app.get('/api/rating/:messengerId', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.candidaturesSheetId);
    try {
      const result = await googleDrive.checkRatingExistence(
        req.params.messengerId
      );
      res.json(result);
    } catch (err) {
      res.status(422).send(err);
    }
  });

  app.post('/api/rating', async (req, res) => {
    const googleDrive = new GoogleDrive(keys.candidaturesSheetId);
    try {
      const result = await googleDrive.submitRating(req.body);
      res.json(result);
    } catch (err) {
      console.log('errors:', err);
      res.status(422).send(err);
    }
  });
};
