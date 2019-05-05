const express = require('express');
const bodyParser = require('body-parser');
const keys = require('./config/keys');

const app = express();

app.use(bodyParser.json());

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

require('./routes/jobRoutes')(app);
require('./routes/candidatureRoutes')(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT);
