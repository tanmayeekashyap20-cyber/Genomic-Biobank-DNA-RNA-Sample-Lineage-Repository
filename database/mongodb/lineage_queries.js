const database = db.getSiblingDB("genomic_biobank");
const lineageEvents = database.getCollection("lineage_events");
const querySet = "standalone";

// Standalone Demonstration Schema
function runStandaloneDemonstrationSchema() {
  // Show the first five documents returned by the collection.
  lineageEvents.find().limit(5).forEach(printjson);

  // Retrieve DNA extraction events.
  lineageEvents.find({ event_type: "DNA_EXTRACTION" }).forEach(printjson);

  // Show the five most recent events.
  lineageEvents
    .find()
    .sort({ timestamp: -1 })
    .limit(5)
    .forEach(printjson);

  // Count documents for each event type, highest count first.
  lineageEvents
    .aggregate([
      {
        $group: {
          _id: "$event_type",
          event_count: { $sum: 1 },
        },
      },
      { $sort: { event_count: -1, _id: 1 } },
    ])
    .forEach(printjson);

  // Display indexes before adding the sample ID index.
  printjson(lineageEvents.getIndexes());

  // Create an ascending index for sample ID lookups.
  lineageEvents.createIndex({ sample_id: 1 });

  // Verify the collection indexes after creation.
  printjson(lineageEvents.getIndexes());
}

// Application-Compatible Queries
function runApplicationCompatibleQueries() {
  // Show the first five documents returned by the collection.
  lineageEvents.find().limit(5).forEach(printjson);

  // Match events using only event types accepted by the application API.
  lineageEvents
    .find({
      eventType: {
        $in: ["collected", "processed", "stored", "transferred", "sequenced"],
      },
    })
    .forEach(printjson);

  // Show the five most recent events, using creation time to break ties.
  lineageEvents
    .find()
    .sort({ eventDate: -1, createdAt: -1 })
    .limit(5)
    .forEach(printjson);

  // Count application events by type, highest count first.
  lineageEvents
    .aggregate([
      {
        $group: {
          _id: "$eventType",
          event_count: { $sum: 1 },
        },
      },
      { $sort: { event_count: -1, _id: 1 } },
    ])
    .forEach(printjson);

  // Display indexes before adding the application sample ID index.
  printjson(lineageEvents.getIndexes());

  // Create an ascending index for application sample ID lookups.
  lineageEvents.createIndex({ sampleId: 1 });

  // Verify the collection indexes after creation.
  printjson(lineageEvents.getIndexes());
}

// Run exactly one query set against documents with its matching schema.
if (querySet === "standalone") {
  runStandaloneDemonstrationSchema();
} else if (querySet === "application") {
  runApplicationCompatibleQueries();
} else {
  throw new Error('Set querySet to "standalone" or "application".');
}
