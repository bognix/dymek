const express = require('express')
const router = express.Router();
const uuid = require('uuid/v4')

const MARKERS_TABLE = process.env.MARKERS_TABLE;

const getRouter = (db) => {
  router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();;
  });

  router.get('/markers', function (req, res) {
    const params = {
      TableName: MARKERS_TABLE
    }

    db.scan(params, (error, result) => {
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

  router.get('/markers/:markerId', function (req, res) {
    if (!req.params.markerId) {
      return res.status(400).json({error: 'Marker ID not set'})
    }

    const params = {
      TableName: MARKERS_TABLE,
      Key: {
        id: req.params.markerId,
      },
    }

    db.get(params, (error, result) => {
      if (error) {
        console.log(error);
        return res.status(400).json({ error: 'Could not get marker' });
      }
      if (result && result.Item) {
        const {content, id} = result.Item;
        return res.json({ content, id });
      } else {
        return res.status(404).json({ error: 'Marker not found' });
      }
    });
  })

  router.post('/markers', function (req, res) {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      return res.status(400).json({ error: 'Lat or Long not set' });
    }

    const latitudeNum = Number(latitude);
    const longitudeNum = Number(longitude);

    if (isNaN(latitudeNum) || isNaN(longitudeNum)) {
      return res.status(400).json({ error: 'Lat or Long has invalid form' });
    }

    const userId = req.headers['x-dymek-user-id']

    if (!userId) {
      return res.status(401).json({ error: 'You can\t post markers as not identified user' });
    }

    const id = uuid()
    const params = {
      TableName: MARKERS_TABLE,
      Item: {id, latitude: latitudeNum, longitude: longitudeNum, userId, createdAt: new Date()},
    };

    db.put(params, (error, item) => {
      if (error) {
        res.status(400).json({ error: 'Could not create marker' });
      }
      res.json({ id, latitude, longitude, userId, createdAt: new Date() });
    });
  })

  router.get('/users', function (req, res) {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) {
      res.status(400).json({ error: 'Lat or Long not set' });
    }

    const id = uuid()
    const params = {
      TableName: MARKERS_TABLE,
      Item: {id, latitude, longitude},
    };

    db.put(params, (error) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not create marker' });
      }
      res.json({ id, latitude, longitude });
    });
  })

  return router
}

module.exports = getRouter
