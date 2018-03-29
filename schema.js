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
  User,
  updateOrCreateUser,
  getUser
} = require ('./db/users');

const {nodeInterface, nodeField} = nodeDefinitions(
  (globalId) => {
    const {type, id} = fromGlobalId(globalId);
    if (type === 'Marker') {
      return getMarker(id)
    }
    return null;
  },
  (obj) => {
    if (obj instanceof Marker) {
      return GraphQLMarker;
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
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (obj) => obj.id
    },
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
    status: {
      type: GraphQLString,
      resolve: obj => obj.status
    },
    reportId: {
      type: GraphQLString,
      resolve: obj => obj.reportId
    }
  },
  interfaces: [nodeInterface],
});

const {
  connectionType: MarkersConnection,
  edgeType: GraphQLMarkerEdge,
} = connectionDefinitions({
  name: 'Marker',
  nodeType: GraphQLMarker,
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

const Root = new GraphQLObjectType({
  name: 'Root',
  fields: {
    markers: {
      type: MarkersConnection,
      args: markerQueryArgs,
      resolve: (obj, args) => {
        return connectionFromPromisedArray(getMarkers({userId: args.userId, markerTypes: args.types, location: args.location}), args)
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
        return getMarkers({}, true)
        .then(markers => {
          return Promise.resolve({
            cursor: offsetToCursor(markers.findIndex((m => m.id === marker.id))),
            node: marker
          })
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

const GraphQLUpdateMarkerMutation = mutationWithClientMutationId({
  name: 'UpdateMarker',
  inputFields: {
    status: { type: GraphQLString },
    id: { type: GraphQLID }
  },
  outputFields: {
    markerEdge: {
      type: GraphQLMarkerEdge,
      resolve: (marker) => {
        return getMarkers({}, true)
        .then(markers => {
          return Promise.resolve({
            cursor: offsetToCursor(markers.findIndex((m => m.id === marker.id))),
            node: marker
          })
        }).catch(err => {
          console.log(err)
          throw new Error(err);
        });
      },
    }
  },
  mutateAndGetPayload: ({id, status}, {req}) => {
    return updateMarker(id, status)
  },
});

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createMarker: GraphQLCreateMarkerMutation,
    updateOrCreateUser: GraphQLUpdateOrCreateUserMutation,
    updateMarker: GraphQLUpdateMarkerMutation
  },
});

module.exports.schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation,
});
