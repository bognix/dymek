const {
    GraphQLBoolean,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString,
    GraphQLFloat
  } = require('graphql');

  const {
    connectionArgs,
    connectionDefinitions,
    connectionFromArray,
    cursorForObjectInConnection,
    fromGlobalId,
    globalIdField,
    mutationWithClientMutationId,
    nodeDefinitions,
    toGlobalId,
  } = require('graphql-relay');

  const {
    Marker,
    getMarkers,
    createMarker
  } = require('./database');

  const {nodeInterface, nodeField} = nodeDefinitions(
    (globalId) => {
      const {type, id} = fromGlobalId(globalId);
      if (type === 'Marker') {
        return getMarker(id);
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

  const GraphQLMarker = new GraphQLObjectType({
    name: 'Marker',
    fields: {
      id: globalIdField('Marker'),
      latitude: {
        type: GraphQLFloat,
        resolve: (obj) => obj.latitude,
      },
      longitude: {
        type: GraphQLFloat,
        resolve: (obj) => obj.longitude,
      },
      createdAt: {
        type: GraphQLString,
        resolve: (obj) => obj.createdAt,
      },
      userId: {
        type: GraphQLID
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

  const argsWithUserId = Object.assign({userId: {
    type: GraphQLID
  }}, connectionArgs)

  const Root = new GraphQLObjectType({
    name: 'Root',
    fields: {
      markers: {
        type: MarkersConnection,
        args: argsWithUserId,
        resolve: (obj, args) => {
          return getMarkers(args.userId).then(items => connectionFromArray(items, args))
        }
      },
      node: nodeField,
    },
  });

  const GraphQLCreateMarkerMutation = mutationWithClientMutationId({
    name: 'CreateMarker',
    inputFields: {
      latitude: { type: new GraphQLNonNull(GraphQLFloat) },
      longitude: { type: new GraphQLNonNull(GraphQLFloat) }
    },
    outputFields: {
      markerEdge: {
        type: GraphQLMarkerEdge,
        resolve: ({localMarkerId}) => {
          const marker = getMarker(localMarkerId);
          return {
            cursor: cursorForObjectInConnection(getMarkers(), marker),
            node: marker,
          };
        },
      }
    },
    mutateAndGetPayload: ({longitude, latitude}) => {
      const localMarkerId = createMarker(latitude, longitude);
      return {localMarkerId};
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
