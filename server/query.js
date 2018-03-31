const {graphql} = require('graphql');
const { toGlobalId } = require('graphql-relay');
const schema = require('../schema');

const query = (str) => {
  return graphql(schema.schema, str);
}

function getReportWithUserTokens(reportId) {
  const globalId = toGlobalId('Report', reportId)

  return query(`{
    node(id: "${globalId}") {
      id
      ... on Report {
        status,
        hashKey,
        createdAt,
        type,
        geoJson {
          latitude,
          longitude
        }
        markers {
          user {
            registrationToken
          }
        }
      }
    }
  }`)
}

module.exports = {
  getReportWithUserTokens
}
