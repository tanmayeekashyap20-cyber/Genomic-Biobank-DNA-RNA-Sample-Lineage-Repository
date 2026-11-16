# Genomic Biobank & DNA/RNA Sample Lineage Repository
# MongoDB and Lineage Event Documentation

## 1. Introduction

The project uses MongoDB to maintain additional lineage event
history for biological samples.

PostgreSQL is the primary relational database, while MongoDB
stores flexible event records describing activities throughout
the sample lifecycle.

This approach combines relational data management with
document-based event storage.

## 2. MongoDB Database

Database name:

genomic_biobank

Collection name:

lineage_events

The lineage_events collection stores individual events
associated with biological samples.

## 3. Purpose of Lineage Events

Lineage events provide a chronological history of activities
performed on biological samples.

Examples include:

- Sample collection
- Laboratory processing
- Sample storage
- Sample transfer
- Sequencing

These records help users understand the history of a sample
beyond its current status.

## 4. Lineage Event Document Structure

Each event document contains the following application fields:

### sampleId
Identifies the associated biological sample.

The sample identifier connects the MongoDB event with
the corresponding sample record in PostgreSQL.

### eventType
Describes the type of activity performed on the sample.

Supported values:

- collected
- processed
- stored
- transferred
- sequenced

### description
Contains a description of the activity.

The backend validates the description to contain
between 3 and 500 characters.

### eventDate
Represents the date and time of the event.

It is optional when submitting an event. The backend
can assign the current date and time when omitted.

### performedBy
Identifies the person associated with the event.

This field is optional.

## 5. Example Lineage Event Document

The following is an illustrative example of an event document.
MongoDB also generates its own document identifier.

{
  "sampleId": "SAMPLE-001",
  "eventType": "collected",
  "description": "Biological sample collected from donor",
  "eventDate": "2026-01-15T10:30:00.000Z",
  "performedBy": "Researcher"
}

Note: The example identifiers and values are illustrative.
Actual identifiers depend on the database records.

## 6. Event Types

### Collected
Records the initial collection of a biological sample.

### Processed
Records a laboratory processing activity.

### Stored
Records that a sample has been placed in storage.

### Transferred
Records the transfer of a sample between locations
or storage units.

### Sequenced
Records a sequencing-related activity.

## 7. PostgreSQL and MongoDB Integration

The project uses both databases for different purposes.

### PostgreSQL Responsibilities

PostgreSQL stores:
- Donor records
- Consent records
- Biological samples
- Sample types
- Researchers
- Laboratory processes
- Parent-child sample relationships
- Storage information
- Experiments
- Sequencing results
- Application users
- Audit records

### MongoDB Responsibilities

MongoDB stores:
- Sample lineage event history
- Event descriptions
- Event types
- Event dates
- Associated performer information

### Integration Flow

1. A user submits a lineage event through the frontend.
2. The frontend sends a request to the lineage-events API.
3. The backend authenticates the user and checks permissions.
4. The backend validates the event information.
5. The backend checks whether the referenced sample exists
   in PostgreSQL.
6. If the sample exists, the event is stored in MongoDB.
7. The backend returns the response to the frontend.

This integration ensures that lineage events refer to
existing PostgreSQL sample records when created through
the application API.

## 8. API Endpoint

The lineage event API is:

GET /api/lineage-events

POST /api/lineage-events

### GET
Retrieves lineage event records.

### POST
Creates a new lineage event.

The POST request accepts:
- sampleId
- eventType
- description
- eventDate (optional)
- performedBy (optional)

The backend validates the event type and description
before inserting the document.

The API also checks the referenced PostgreSQL sample.

## 9. Data Validation

The application applies validation rules to lineage events.

Important rules include:

- sampleId must identify an existing sample.
- eventType must be one of the supported event types.
- description must contain between 3 and 500 characters.
- eventDate must be a valid date when supplied.
- performedBy is optional.

## 10. Advantages of MongoDB Event Storage

- Flexible document structure.
- Suitable for storing event-based records.
- Supports additional sample history.
- Keeps event descriptions separate from core relational data.
- Supports chronological sample traceability.
- Complements PostgreSQL relational storage.

## 11. Important Design Considerations

PostgreSQL remains the authoritative source for sample records
and parent-child relationships.

MongoDB stores additional lineage events.

The two databases are separate systems. A PostgreSQL
transaction does not automatically include a MongoDB write.

Therefore, application-level validation and appropriate
error handling are important when connecting the databases.

## 12. Conclusion

MongoDB supports the Genomic Biobank & DNA/RNA Sample
Lineage Repository by storing additional sample lifecycle
events in the lineage_events collection.

PostgreSQL maintains the primary relational records, while
MongoDB provides a flexible structure for event history.

Together, these databases support sample tracking,
history management, and biological sample traceability.
