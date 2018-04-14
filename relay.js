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

function connectionForReports(reportsPromised) {
  return reportsPromised
    .then(reports => {
      const pageInfo = {
        hasPreviousPage: false,
        hasNextPage: false,
        startCursor: cursorForReport(reports[0]),
        endCursor: cursorForReports(reports[reports.length-1]),
      }

      return {
        pageInfo,
        total: reports.length,
        edges: reports.map(marker => {
          return {
            node: report,
            cursor: cursorForReport(report)
          }
        })
      }
    })
}

function cursorForReport(report) {
  if (!report)  return ''
  return Buffer.from(`${report.hashKey}:${report.createdAt}`).toString('base64');
}

module.exports = {
  connectionForMarkers,
  cursorForMarker,
  connectionForReports,
  cursorForReport
}
