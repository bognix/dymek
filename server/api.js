const express = require('express')
const router = express.Router();
const uuid = require('uuid/v4')
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const schema = require('../schema');

const MARKERS_TABLE = process.env.MARKERS_TABLE;



router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-dymek-*");
  next();;
});

router.use('/markers', (req, res) => graphqlHTTP({
  schema: schema.schema,
  graphiql: true,
  rootValue: root,
  context: {req, res}
})(req, res))



module.exports = router
