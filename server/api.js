const express = require('express')
const router = express.Router();
const graphqlHTTP = require('express-graphql');
const { buildSchema } = require('graphql');
const schema = require('../schema');

router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-dymek-*");
  next();;
});

router.use('/q', (req, res) => graphqlHTTP({
  schema: schema.schema,
  graphiql: true,
  rootValue: root,
  context: {req, res}
})(req, res))

module.exports = router
