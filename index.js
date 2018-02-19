const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const uuid = require('uuid/v4')

const MARKERS_TABLE = process.env.MARKERS_TABLE;
const IS_OFFLINE = process.env.IS_OFFLINE;
const DEV_DB_PORT = process.env.DEV_DB_PORT

let dynamoDb
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: `http://localhost:${DEV_DB_PORT}`
  })
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
}

app.use(bodyParser.json({ strict: false }));

app.get('/api/markers', function (req, res) {
  const params = {
    TableName: MARKERS_TABLE
  }

  dynamoDb.scan(params, (error, result) => {
    if (error) {
      console.log(error);
      return res.status(400).json({ error: 'Could not get markers' });
    }

    if (result && result.Items) {
      return res.json({ items: result.Items, meta: {
        total: result.Count
      } });
    }

    console.log(error);
    return res.status(400).json({ error: 'Could not get markers' });
  });
})

app.get('/api/markers/:markerId', function (req, res) {
  if (!req.params.markerId) {
    return res.status(400).json({error: 'Marker ID not set'})
  }

  const params = {
    TableName: MARKERS_TABLE,
    Key: {
      id: req.params.markerId,
    },
  }

  dynamoDb.get(params, (error, result) => {
    if (error) {
      console.log(error);
      return res.status(400).json({ error: 'Could not get marker' });
    }
    if (result && result.Item) {
      const {content, id} = result.Item;
      return res.json({ content, id });
    } else {
      return res.status(404).json({ error: "Marker not found" });
    }
  });
})

app.post('/api/markers', function (req, res) {
  const { lattitude, longitude } = req.body;
  if (!lattitude || !longitude) {
    res.status(400).json({ error: 'Lat or Long not set' });
  }

  const id = uuid()
  const params = {
    TableName: MARKERS_TABLE,
    Item: {id,lattitude, longitude},
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create marker' });
    }
    res.json({ id, lattitude, longitude });
  });
})


module.exports.handler = serverless(app);
