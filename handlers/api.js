const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const uuid = require('uuid/v4')
const apiRouter = require('../server/api');

app.use(bodyParser.json({ strict: false }));
app.use('/api', apiRouter)

module.exports.handler = serverless(app);
