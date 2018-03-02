const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const uuid = require('uuid/v4')
const apiRouter = require('./api');

const MARKERS_TABLE = process.env.MARKERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
const DEV_DB_PORT = process.env.DEV_DB_PORT


app.use(bodyParser.json({ strict: false }));
app.use('/api', apiRouter)


module.exports.handler = serverless(app);
