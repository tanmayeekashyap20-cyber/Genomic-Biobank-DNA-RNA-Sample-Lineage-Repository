# API Reference
## Genomic Biobank & DNA/RNA Sample Lineage Repository

This document describes the backend REST API implemented using Next.js Route Handlers, PostgreSQL, MongoDB, and JWT-based authentication.

Base URL during local development:
`http://localhost:3000`

All API routes are under `/api`.

## Authentication

Authentication uses a JWT session stored in an HttpOnly cookie named `biobank-session`.

- Login: `POST /api/auth/login`
- Logout: `POST /api/auth/logout`
- Current session: `GET /api/auth/me`
- Session duration: 8 hours
- Password verification: Argon2
- JWT signing: HS256
- Cookie settings include HttpOnly, SameSite=Lax, and Secure in production.

### Roles

| Role | Permissions |
|---|---|
| Admin | Full API access, including permitted deletion and administrative endpoints |
| Researcher | Read and create/update research records; deletion restricted |
| Lab Technician | Not authorized by the current API role policies |

### Common responses

| Status | Meaning |
|---|---|
| 200 | Request successful |
| 201 | Record created |
| 400 | Invalid input or invalid referenced data |
| 401 | Authentication required |
| 403 | Insufficient role permissions |
| 404 | Record not found |
| 409 | Duplicate or conflicting record |
| 500 | Unexpected server error |

Authenticated endpoints require a valid session cookie. Protected routes return JSON responses.

## Endpoint Summary

| Endpoint | Methods | Access |
|---|---|---|
| `/api/auth/login` | POST | Public |
| `/api/auth/logout` | POST | Authenticated |
| `/api/auth/me` | GET | Authenticated |
| `/api/donors` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/consents` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/researchers` | GET, POST, PATCH, DELETE | GET Admin/Researcher; writes Admin |
| `/api/samples` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/sample-options` | GET | Admin, Researcher |
| `/api/experiments` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/processes` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/sample-processes` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/sample-lineage` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/lineage-graph` | GET | Admin, Researcher |
| `/api/experiment-samples` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/sequencing-results` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/storage-units` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/sample-storage` | GET, POST, PATCH, DELETE | Admin, Researcher; DELETE Admin |
| `/api/lineage-events` | GET, POST | Admin, Researcher |
| `/api/db-check` | GET | Admin |
| `/api/mongodb-test` | GET | Admin |

## Authentication Endpoints

### POST /api/auth/login

Authenticates a user and establishes the session cookie.

The request uses the configured login credentials. Passwords are verified against the stored Argon2 hash.

Successful authentication establishes the `biobank-session` cookie.

### POST /api/auth/logout

Logs out the current user and clears the session cookie.

### GET /api/auth/me

Returns the authenticated user's session information and current role.

Returns 401 when no valid session exists.

## PostgreSQL APIs

### Donors — `/api/donors`

GET:
Returns donor records, ordered by donor ID, with a maximum of 100 records.

POST:
Creates a donor.

Required:
- `full_name`

Optional:
- `date_of_birth`
- `gender`
- `phone_number`
- `email`
- `address`

PATCH:
Updates a donor using `?id=<donor_id>`.
At least one update field is required.

DELETE:
Deletes a donor using `?id=<donor_id>`.
Admin only. Referenced donor records cannot be deleted.

### Consents — `/api/consents`

Supports GET, POST, PATCH, DELETE.

Admin and Researcher can read and create/update consent records.
DELETE is Admin-only.

Consent records are stored in PostgreSQL and associated with donors.

### Researchers — `/api/researchers`

GET:
Returns researcher records.

POST:
Creates a researcher. Admin only.

PATCH:
Updates a researcher using `?id=<researcher_id>`. Admin only.

DELETE:
Deletes a researcher using `?id=<researcher_id>`. Admin only.

Researcher fields include:
- `full_name`
- `department`
- `role`
- `email`
- `phone`

### Samples — `/api/samples`

GET:
Returns sample records with sample type, donor, storage location, and lineage information. Maximum 100 records.

POST:
Creates a sample.

Required:
- `donor_id`
- `sample_type_id`
- `collection_date`

Optional:
- `collection_location`
- `status`
- `description`

Default status: `collected`.

PATCH:
Updates a sample using `?id=<sample_id>`.

DELETE:
Deletes a sample using `?id=<sample_id>`. Admin only. Referenced samples cannot be deleted.

### Sample Options — `/api/sample-options`

GET:
Returns donor and sample-type options for frontend dropdowns.

Response includes:
- `donors`
- `sampleTypes`

### Experiments — `/api/experiments`

Supports GET, POST, PATCH, DELETE.

Experiment records include:
- `experiment_name`
- `experiment_type`
- `start_date`
- `end_date`
- `researcher_id`
- `status`
- `description`

Experiment creation requires an experiment name and researcher ID.
The end date cannot precede the start date when both are supplied.

### Processes — `/api/processes`

Supports GET, POST, PATCH, DELETE.

Process records include:
- `process_type`
- `process_date`
- `performed_by`
- `description`

Process creation requires process type, process date, and researcher ID.

### Sample Processes — `/api/sample-processes`

Supports GET, POST, PATCH, DELETE.

Fields:
- `process_id`
- `input_sample_id`
- `output_sample_id`
- `quantity`
- `unit`

Input and output samples must be different.
Quantity must be nonnegative when provided.

### Sample Lineage — `/api/sample-lineage`

Supports GET, POST, PATCH, DELETE.

Fields:
- `parent_sample_id`
- `child_sample_id`
- `relationship_type`
- `notes`

Parent and child must be different samples.
The API checks for duplicate relationships and lineage cycles.

### Lineage Graph — `/api/lineage-graph`

GET:
Returns PostgreSQL donor/sample information and parent-child sample relationships for lineage visualization.

This endpoint supplies graph data. The frontend is responsible for rendering the graph.

### Experiment Samples — `/api/experiment-samples`

Supports GET, POST, PATCH, DELETE.

Manages associations between experiments and samples.

### Sequencing Results — `/api/sequencing-results`

Supports GET, POST, PATCH, DELETE.

Fields include:
- `sample_id`
- `experiment_id`
- `sequencing_platform`
- `run_date`
- `file_path`
- `result_status`
- `notes`

Default result status: `pending`.

### Storage Units — `/api/storage-units`

Supports GET, POST, PATCH, DELETE.

Fields include:
- `freezer_id`
- `rack_no`
- `box_no`
- `position`
- `temperature`
- `status`

Storage unit status defaults to `available`.

### Sample Storage — `/api/sample-storage`

Supports GET, POST, PATCH, DELETE.

POST:
Assigns a sample to a storage unit.

Required:
- `sample_id`
- `storage_id`

Optional:
- `stored_date`

The API checks sample and storage existence, storage availability, and active assignments.

PATCH:
Uses `?id=<sample_storage_id>` to record a removal date.

DELETE:
Deletes a storage assignment. Admin only.

Storage availability is updated when assignments are removed.

## MongoDB API

### Lineage Events — `/api/lineage-events`

Supports GET and POST.

MongoDB database:
`genomic_biobank`

Collection:
`lineage_events`

GET:
Returns the latest 100 lineage events, sorted by creation time descending.

POST:
Creates a lineage event.

Request fields:
- `sampleId`: positive sample ID
- `eventType`: collected, processed, stored, transferred, or sequenced
- `description`: 3–500 characters
- `eventDate`: optional datetime with timezone
- `performedBy`: optional performer name

The API verifies that the sample exists in PostgreSQL before creating the MongoDB event.

MongoDB events are separate from PostgreSQL parent-child lineage relationships.

This endpoint currently supports GET and POST only.

## Administrative Endpoints

### GET /api/db-check

Admin-only database connectivity check.

### GET /api/mongodb-test

Admin-only MongoDB connectivity check.

## Data and Validation Notes

- PostgreSQL is the primary relational database.
- MongoDB stores lineage event history.
- API request bodies are validated using Zod.
- IDs are expected to be positive integers where applicable.
- Foreign-key failures are handled by the API.
- Duplicate records and conflicting operations may return 409.
- API responses use JSON.
- List endpoints generally return up to 100 records.

## Security Notes

- Protected routes require authentication.
- Authorization is enforced on the server.
- Admin-only actions include deletion and administrative database checks.
- Passwords are stored as Argon2 hashes.
- Session cookies are HttpOnly.
- Secrets must be configured in environment variables and must not be committed to Git.

