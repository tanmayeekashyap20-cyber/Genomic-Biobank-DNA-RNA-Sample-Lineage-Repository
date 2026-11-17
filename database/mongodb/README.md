# MongoDB Atlas lineage-event queries

The MongoDB Shell script targets the `genomic_biobank.lineage_events` collection. It contains two separate query sets for two different document schemas. Choose and run only the set that matches the documents in the collection.

## Atlas setup and running the script

The Atlas cluster has already been configured for this project. To run the script:

1. In MongoDB Atlas, confirm the cluster is running, a database user exists, and the machine's IP address is allowed under Network Access. Grant the user only the database permissions required for the selected queries.
2. Copy the cluster's `mongosh` connection string from Atlas and supply credentials securely. Do not commit the URI or credentials to this repository.
3. From the repository root, connect and run the script:

   ```powershell
   mongosh "<your Atlas connection string>" --file database/mongodb/lineage_queries.js
   ```

The script selects `genomic_biobank.lineage_events` explicitly. At the top of `lineage_queries.js`, `querySet` defaults to `"standalone"`. Set it to `"application"` to run the application-compatible queries instead. The script runs only the selected query set. Do not select a query set until you have confirmed the stored documents use its matching schema.

The application separately reads `MONGODB_URI` from `frontend/.env.local`; keep that value private and out of source control. No Atlas connection string or credential belongs in this script or README.

## Database and collection

| Name | Value |
|---|---|
| Database | `genomic_biobank` |
| Collection | `lineage_events` |
| Existing demonstration data | Five synthetic documents, as previously inserted |

The query sets do not insert, update, or delete documents. The selected set does create an index, which is a database write.

## Standalone Demonstration Schema

The original demonstration query set uses snake_case fields. It is intended for demonstration documents with this shape:

| Field | Purpose | Expected representation |
|---|---|---|
| `_id` | MongoDB document identifier | MongoDB-generated `ObjectId` |
| `sample_id` | Associated sample identifier | Consistent scalar value, such as a number |
| `event_type` | Event category | String; the demonstration extraction query uses `DNA_EXTRACTION` |
| `timestamp` | Event time | BSON `Date` |

The standalone queries:

1. Return the first five documents with `find().limit(5)`; no order is guaranteed.
2. Find documents where `event_type` is exactly `DNA_EXTRACTION`.
3. Return the five most recent events by sorting `timestamp` descending.
4. Count documents by `event_type` using `$group` and sort counts descending.
5. Display indexes with `getIndexes()`.
6. Create an ascending index on `sample_id`.
7. Display indexes again to verify the index creation.

The event-count aggregation groups by `"$event_type"`, sums one per document, then sorts by count descending and event type ascending for consistent ties.

## Application-Compatible Queries

These queries match the document fields written and read by `frontend/app/api/lineage-events/route.ts`. Run this query set **only against documents that use the application's schema**. In particular, the five snake_case demonstration documents are not automatically compatible; this query set will not return meaningful field-based results for those documents.

The application stores:

| Field | Purpose | Representation / behavior |
|---|---|---|
| `_id` | MongoDB document identifier | MongoDB-generated `ObjectId` |
| `sampleId` | PostgreSQL sample identifier | Positive integer |
| `eventType` | Lineage event category | One of `collected`, `processed`, `stored`, `transferred`, `sequenced` |
| `description` | Event description | Trimmed string, 3-500 characters |
| `eventDate` | Event time | BSON `Date`; supplied date or current time |
| `performedBy` | Authenticated username | Set by the application |
| `performedByUserId` | Authenticated user's ID | Set by the application |
| `createdAt` | Document creation time | BSON `Date`, set by the application |

The compatible queries:

1. Return the first five documents with `find().limit(5)`; no order is guaranteed.
2. Filter on `eventType` using only the five values accepted by the application API: `collected`, `processed`, `stored`, `transferred`, and `sequenced`.
3. Return the five most recent events by sorting `eventDate` descending and `createdAt` descending as a tie-breaker.
4. Count documents by `eventType` using `$group` and sort counts descending.
5. Display indexes with `getIndexes()`.
6. Create an ascending index on `sampleId`.
7. Display indexes again to verify the index creation.

This section does not use `DNA_EXTRACTION`; that is a demonstration-schema value, not an application event type.

## Indexing

Each query set creates an index for its schema: `{ sample_id: 1 }` for standalone demonstration documents, or `{ sampleId: 1 }` for application documents. These indexes are not interchangeable. The application API filters on `sampleId`, so the snake_case index does not support that application filter.

MongoDB also maintains the built-in unique `_id` index. Creating an equivalent index again reuses the existing index. The displayed `getIndexes()` results show the collection's indexes before and after the selected index operation.
