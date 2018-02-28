const express = require('express')
const router = express.Router();
const uuid = require('uuid/v4')
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');

const MARKERS_TABLE = process.env.MARKERS_TABLE;

const schema = buildSchema(`
input MarkerInput {
  latitude: Float!
  longitude: Float!
}
type Query {
  markers(userId: String): [Marker!]!
}
type Marker {
  userId: ID! @unique
  id: ID! @unique
  latitude: Float!
  longitude: Float!
  createdAt: String!
}
type Mutation {
  createMarker(input: MarkerInput): Marker
}
`)

const getRouter = (db) => {
  router.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-dymek-*");
    next();;
  });

  const root = {
    markers: function({userId}) {
      return new Promise ((resolve, reject) => {
        let FilterExpression = '';
        let ExpressionAttributeValues = {}
        if (userId) {
          FilterExpression += "userId=:userId"
          ExpressionAttributeValues[':userId'] = userId
        }
        const params = {
          TableName: MARKERS_TABLE
        }

        if (Object.keys(ExpressionAttributeValues).length > 0) {
          Object.assign(params, {
            ExpressionAttributeValues,
            FilterExpression
          })
        }

        db.scan(params, (error, result) => {
          if (error) {
            console.log(error);
            return reject({ error: 'Could not get markers' })
          }

          if (result && result.Items) {
            return resolve(result.Items)
          }

          console.log(error);
          return reject({ error: 'Could not get markers' })
        });
      })
    },
    createMarker({input}) {
      return new Promise((resolve, reject) => {
        const { latitude, longitude } = input;
        if (!latitude || !longitude) {
          return reject({ error: 'Lat or Long not set' });
        }

        const latitudeNum = Number(latitude);
        const longitudeNum = Number(longitude);

        if (isNaN(latitudeNum) || isNaN(longitudeNum)) {
          return reject({ error: 'Lat or Long has invalid form' });
        }

        // const userId = req.headers['x-dymek-user-id']

        // if (!userId) {
        //   return res.status(401).json({ error: 'You can not post markers as not identified user' });
        // }

        const id = uuid()
        const createdAt = new Date().toISOString()

        const params = {
          TableName: MARKERS_TABLE,
          Item: {id, latitude: latitudeNum, longitude: longitudeNum, userId: '123', createdAt},
        };

        db.put(params, (error, item) => {
          if (error) {
            reject.json({ error: 'Could not create marker' });
          }
          resolve({ id, latitude, longitude, userId: '123', createdAt });
        });
      })
    }
  }

  router.use('/markers', graphqlHTTP({
    schema: schema,
    graphiql: true,
    rootValue: root
  }))


  return router
}

module.exports = getRouter
