const reports = require('../db/reports');
const markers = require('../db/markers');

const handler = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;
  const marker = JSON.parse(event.Records[0].Sns.Message);
  reports.getReportForMarker(marker)
    .then(reportForMarker => {
      if (!reportForMarker) return reports.createReportForMarker(marker)
      return reportForMarker;
    }).then(createdReport => {
      return markers.updateMarker(marker.id, {
        reportId: createdReport.id
      })
    }).then(updatedMarker => {
      callback(null, updatedMarker)
    });
}

module.exports = {
  handler
}
