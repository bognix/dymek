function connectionForMarkers(markersPromised) {
  return markersPromised
    .then(markers => {
      const pageInfo = {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: cursorForMarker(markers[0]),
        endCursor: cursorForMarker(markers[markers.length-1]),
      }

      return {
        pageInfo,
        total: markers.length,
        edges: markers.map(marker => {
          return {
            node: marker,
            cursor: cursorForMarker(marker)
          }
        })
      }
    })
}

function cursorForMarker(marker) {
  if (!marker)  return ''
  return Buffer.from(`${marker.hashKey}:${marker.createdAt}`).toString('base64');
}

module.exports = {
  connectionForMarkers,
  cursorForMarker
}
