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
  MARKERS_SUPPORTED_TYPES
} = require('./database');

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
    }
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

const GraphQLMarker = new GraphQLObjectType({
  name: 'Marker',
  fields: {
    id: {
      type: new GraphQLNonNull(GraphQLID),
      resolve: (obj) => toGlobalId('Marker', obj.id)
    },
    createdAt: {
      type: GraphQLString,
      resolve: (obj) => obj.createdAt,
    },
    userId: {
      type: GraphQLID
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

const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    createMarker: GraphQLCreateMarkerMutation
  },
});

module.exports.schema = new GraphQLSchema({
  query: Root,
  mutation: Mutation,
});
