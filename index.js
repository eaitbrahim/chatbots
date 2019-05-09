const express = require('express');
const bodyParser = require('body-parser');
const keys = require('./config/keys');

const app = express();

app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

app.use(bodyParser.json());

require('./routes/jobRoutes')(app);
require('./routes/candidatureRoutes')(app);
require('./routes/ratingRoutes')(app);

const PORT = process.env.PORT || 5000;
app.listen(PORT);
