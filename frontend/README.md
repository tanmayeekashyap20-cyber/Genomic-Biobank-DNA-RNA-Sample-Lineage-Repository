# Frontend - Genomic Biobank Repository

## Overview

The frontend is built using Next.js, React, and TypeScript.
It provides the application interface for the Genomic Biobank repository.

## Technology Stack
- Next.js
- React
- TypeScript
- Tailwind CSS
- React Flow
- PostgreSQL
- MongoDB

## Database Integration

### PostgreSQL
Stores structured donor, consent, sample, experiment, processing, storage, and sequencing records.

### MongoDB
Stores sample lineage event documents in the lineage_events collection.

## Authentication

The application includes authentication and role-based authorization.
Supported roles include Admin, Researcher, and Lab Technician.

## Sample Lineage

PostgreSQL maintains sample relationships, while MongoDB stores additional lineage events.

## Environment Configuration

Environment variables are maintained locally.
Never commit database passwords, authentication secrets, or .env.local.

## Implementation Notes

The dashboard, records, forms, and lineage explorer use database-backed API functionality.

## Related Documentation

Refer to the root README and documentation directory for setup, database schemas, API details, and architecture.

## Additional API Endpoints

The following endpoints support combined database operations and audit history:

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/processing-events` | Creates a processing record and its input/output sample relationship in one PostgreSQL transaction. |
| POST | `/api/experiment-records` | Creates an experiment and its sample association in one PostgreSQL transaction. |
| GET | `/api/audit-logs` | Returns the latest audit records. Administrator access is required. |

### Processing and Experiment Validation

- Processing events validate process details, researcher ID, sample IDs, quantity, and unit.
- Input and output samples must be different.
- Experiment status must be `planned`, `in_progress`, `completed`, or `on_hold`.
- Experiment end dates cannot precede start dates.
- Combined operations use PostgreSQL transactions to prevent partial inserts.

### Audit History

The audit-log API returns up to 100 recent records, ordered by timestamp.
The Records page displays audit IDs, actions, affected tables, record IDs,
user IDs, timestamps, and event details.

The existing sample status trigger records status changes in `audit_log`.
Other operations are not automatically audited by that trigger.

