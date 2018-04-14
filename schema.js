const {
  GraphQLBoolean,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLInputObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLFloat,
  GraphQLEnumType
} = require('graphql');

const {
  connectionArgs,
  connectionDefinitions,
  connectionFromPromisedArray,
  cursorForObjectInConnection,
  offsetToCursor,
  fromGlobalId,
  globalIdField,
  mutationWithClientMutationId,
  nodeDefinitions,
  toGlobalId,
} = require('graphql-relay');

const {
  Marker,
  getMarkers,
  getMarker,
  createMarker,
  updateMarker,
  MARKERS_SUPPORTED_TYPES
} = require('./db/markers');

const  {
  updateOrCreateUser,
  getUser
} = require ('./db/users');

const reportDB = require ('./db/reports');

const {
  connectionForMarkers,
  cursorForMarker,
  connectionForReports,
  cursorForReport
} = require('./relay');

const {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    const {type, id} = fromGlobalId(globalId);
    if (type === 'Marker') {
      return getMarker(id)
    }

    if (type === 'Report') {
      return reportDB.getReport(id)
    }

    return null;
  },
  (obj) => {
    if (obj instanceof Marker) {
      return GraphQLMarker;
    }

    if (obj instanceof reportDB.Report) {
      return GraphQLReport;
    }

    return null;
  }
);

const GraphQLGeoJson = new GraphQLObjectType({
  name: 'geo',
  fields: {
    latitude: {
      type: GraphQLFloat,
      resolve: obj => obj.coordinates[1]
    },
    longitude: {
      type: GraphQLFloat,
      resolve: obj => obj.coordinates[0]
    },
  }
});

const GraphQLQueryRadius = new GraphQLInputObjectType({
  name: 'QueryRadius',
  fields: {
    radius: {
      type: GraphQLInt
    },
    latitude: {type: GraphQLFloat},
    longitude: {type: GraphQLFloat}
  }
})

const GraphQLUser = new GraphQLObjectType({
  name: 'User',
  fields: {
    userId: {
      type: GraphQLID,
      resolve: obj => obj.userId
    },
    registrationToken: {
      type: GraphQLString,
      resolve: obj => obj.registrationToken
    }
  }
});

const GraphQLMarker = new GraphQLObjectType({
  name: 'Marker',
  fields: () => ({
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (obj) => obj.id
    },
    globalId: globalIdField(),
    createdAt: {
      type: GraphQLString,
      resolve: (obj) => obj.createdAt,
    },
    user: {
      type: GraphQLUser,
      resolve: (obj) => getUser(obj.userId)
    },
    type: {
      type: GraphQLString,
      resolve: obj => MARKERS_SUPPORTED_TYPES[obj.type]
    },
    geoJson: {
      type: GraphQLGeoJson,
      resolve: obj => {
        return JSON.parse(obj.geoJson)
      }
    },
    hashKey: {
      type: GraphQLString,
      resolve: obj => obj.hashKey
    },
    geoHash: {
      type: GraphQLString,
      resolve: obj => obj.geohash
    },
    report: {
      type: GraphQLReport,
      resolve: (obj) => reportDB.getReport(obj.reportId)
    },
  }),
  interfaces: [nodeInterface],
});

const GraphQLReport = new GraphQLObjectType({
  name: 'Report',
  fields: () => ({
    id: {
      type: GraphQLNonNull(GraphQLID),
      resolve: obj => obj.id
    },
    status: {
      type: GraphQLString,
      resolve: obj => obj.status
    },
    type: {
      type: GraphQLString,
      resolve: obj => obj.type
    },
    geoJson: {
      type: GraphQLGeoJson,
      resolve: obj => {
        return JSON.parse(obj.geoJson)
      }
    },
    createdAt: {
      type: GraphQLString,
      resolve: obj => {
        return obj.createdAt
      }
    },
    hashKey: {
      type: GraphQLInt,
      resolve: obj => obj.hashKey
    },
    updatedAt: {
      type: GraphQLString,
      resolve: obj => obj.updatedAt
    },
    markers: {
      type: MarkersConnection,
      resolve: (obj) => {
        return connectionForMarkers(getMarkers({reportId: obj.id}))
      }
    },
    globalId: globalIdField(),
  }),
  interfaces: [nodeInterface],
});

const {
  connectionType: MarkersConnection,
  edgeType: GraphQLMarkerEdge,
} = connectionDefinitions({
  name: 'Marker',
  nodeType: GraphQLMarker,
  connectionFields: {
    total: {
      type: GraphQLInt,
      description: 'Total number of items',
      resolve: connection => connection.total
    },
    firstCreate: {
      type: GraphQLString,
      description: 'Date of creation of the first item',
      resolve: connection => connection.firstCreate
    },
    lastCreate: {
      type: GraphQLString,
      description: 'Date of creation of the last item',
      resolve: connection => connection.lastCreate
    }
  }
});

const {
  connectionType: ReportsConnection,
  edgeType: GraphQLReportEdge,
} = connectionDefinitions({
  name: 'Report',
  nodeType: GraphQLReport,
});

const markerQueryArgs = Object.assign({
  userId: {
    type: GraphQLID
  },
  types: {
    type: new GraphQLList(GraphQLString)
  },
  location: {
    type: GraphQLQueryRadius
  }
}, connectionArgs)

const reportQueryArgs = Object.assign({
  location: {
    type: GraphQLQueryRadius
  },
  types: {
    type: new GraphQLList(GraphQLString)
  },
}, connectionArgs)

const Root = new GraphQLObjectType({
  name: 'Root',
  fields: {
    markers: {
      type: MarkersConnection,
      args: markerQueryArgs,
      resolve: (obj, args) => {
        return connectionForMarkers(getMarkers(args))
      }
    },
    reports: {
      type: ReportsConnection,
      args: reportQueryArgs,
      resolve: (obj, args) => {
        return connectionForReports(reportDB.getReports({location: args.location}))
      }
    },
    node: nodeField,
  },
});

const GraphQLCreateMarkerMutation = mutationWithClientMutationId({
  name: 'CreateMarker',
  inputFields: {
    latitude: { type: new GraphQLNonNull(GraphQLFloat) },
    longitude: { type: new GraphQLNonNull(GraphQLFloat) },
    type: {type: GraphQLString}
  },
  outputFields: {
    markerEdge: {
      type: GraphQLMarkerEdge,
      resolve: (marker) => {
          return Promise.resolve({
            cursor: cursorForMarker(marker),
            node: marker
        }).catch(err => {
          console.log(err)
          throw new Error(err);
        });
      },
    }
  },
  mutateAndGetPayload: ({longitude, latitude, type}, {req}) => {
    const userId = req.headers['x-dymek-user-id'] || (req.body.variables.dev && '123-456')
    return createMarker(latitude, longitude, type, userId)
  },
});

const GraphQLUpdateOrCreateUserMutation = mutationWithClientMutationId({
  name: 'UpdateOrCreateUser',
  inputFields: {
    registrationToken: { type: GraphQLString },
  },
  outputFields: {
    user: {
      type: GraphQLUser,
      resolve: (user) => user,
    }
  },
  mutateAndGetPayload: ({registrationToken}, {req}) => {
    const userId = req.headers['x-dymek-user-id'] || (req.body.variables.dev && '123-456')
    return updateOrCreateUser(userId, registrationToken)
  },
});

const GraphQLUpdateReportMutation = mutationWithClientMutationId({
  name: 'UpdateReport',
  inputFields: {
    id: { type: GraphQLID },
    status: { type: GraphQLString }
  },
  outputFields: {
    reportEdge: {
      type: GraphQLReportEdge,
      resolve: (report) => {
        return Promise.resolve({
          cursor: cursorForReport(report),
          node: report
        }).catch(err => {
          console.log(err)
          throw new Error(err);
        });
      },
    }
  },
  mutateAndGetPayload: ({id, status}, {req}) => {
    return reportDB.updateReport(id, {status})
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createMarker: GraphQLCreateMarkerMutation,
    updateOrCreateUser: GraphQLUpdateOrCreateUserMutation,
    updateReport: GraphQLUpdateReportMutation
  },
});

module.exports.schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation,
});
