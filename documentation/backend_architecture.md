# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Backend Architecture Documentation

## 1. Introduction

The Genomic Biobank & DNA/RNA Sample Lineage Repository is designed
to manage biological samples and maintain their complete history
throughout collection, processing, storage, experimentation,
and sequencing.

The backend provides application programming interfaces (APIs)
that allow the frontend to communicate with the databases.

The system uses PostgreSQL for structured relational data and
MongoDB for lineage event history.

## 2. Technology Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend
- Next.js API Routes
- TypeScript
- Node.js

### Relational Database
- PostgreSQL

### NoSQL Database
- MongoDB

### Authentication and Security
- JWT-based session authentication
- Argon2 password hashing
- Role-based access control
- Secure HTTP cookies

## 3. Overall System Architecture

The system follows a layered architecture.

### Layer 1: Presentation Layer

The presentation layer provides the user interface.

Users interact with the application to:
- Register donors.
- Manage consent records.
- Register biological samples.
- View sample lineage.
- Manage laboratory processes.
- Manage experiments.
- View storage information.
- Access sequencing results.

### Layer 2: Application Layer

The application layer contains the Next.js backend API routes.

Its responsibilities include:
- Receiving frontend requests.
- Validating incoming data.
- Applying business rules.
- Checking user authentication.
- Enforcing role-based permissions.
- Communicating with databases.
- Returning API responses.

### Layer 3: Database Layer

The database layer contains two database systems.

PostgreSQL stores structured relational records.

MongoDB stores sample lineage event history.

## 4. PostgreSQL Architecture

PostgreSQL is the primary relational database.

It stores information in related tables.

The major database modules include:

### Donor Management
Stores donor registration and contact information.

### Consent Management
Maintains donor consent information and consent status.

### Sample Management
Stores sample identification, donor association, sample type,
collection date, and current status.

### Researcher Management
Stores researcher information.

### Laboratory Processing
Maintains laboratory process information and sample processing records.

### Sample Lineage
Maintains parent-child relationships between biological samples.

### Storage Management
Tracks storage units and sample storage history.

### Experiment Management
Stores experiments and their associated samples.

### Sequencing Management
Maintains sequencing result information.

### User Management
Stores application users and their assigned roles.

### Audit Management
Maintains records of relevant database operations.

## 5. MongoDB Architecture

MongoDB is used to maintain lineage event history.

The MongoDB collection used by the application is:

lineage_events

Each event represents an activity in the history of a biological sample.

Event information includes:
- sampleId
- eventType
- description
- eventDate
- performedBy

Supported event types include:
- collected
- processed
- stored
- transferred
- sequenced

Before a lineage event is saved, the backend checks that the
associated sample exists in PostgreSQL.

This maintains a connection between PostgreSQL sample records
and MongoDB lineage events.

## 6. API Architecture

The frontend communicates with the backend through REST-style APIs.

The backend provides endpoints for:

### Authentication
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/me

### Donor and Consent Management
- /api/donors
- /api/consents

### Sample Management
- /api/samples
- /api/sample-options

### Researcher Management
- /api/researchers

### Laboratory Processing
- /api/processes
- /api/sample-processes

### Sample Lineage
- /api/sample-lineage
- /api/lineage-graph
- /api/lineage-events

### Storage Management
- /api/storage-units
- /api/sample-storage

### Experiment Management
- /api/experiments
- /api/experiment-samples

### Sequencing Management
- /api/sequencing-results

### Database Information
- /api/db-check
- /api/mongodb-test

## 7. Authentication and Authorization

The application uses authentication to identify users.

Passwords are stored as secure Argon2 hashes rather than
plain-text passwords.

JWT-based sessions are used to maintain authenticated access.

The session cookie is configured with security properties
including HttpOnly and SameSite=Lax. Secure cookies are used
in production.

The application supports the following roles:

### Administrator
- Access to administrative functions.
- Manage application records.
- Perform permitted deletion operations.
- Manage administrative resources.

### Researcher
- Access permitted research records.
- Create and update permitted records.
- View sample and experiment information.

### Lab Technician
- A separate application role.
- Access depends on the permissions assigned by the backend.

Authorization is enforced on the server side through API
permission checks.

## 8. Data Flow

### PostgreSQL Data Flow

1. A user performs an action in the frontend.
2. The frontend sends a request to a backend API.
3. The backend authenticates the user.
4. The backend checks the user's permissions.
5. The request data is validated.
6. The backend communicates with PostgreSQL.
7. PostgreSQL performs the requested database operation.
8. The backend returns a response to the frontend.

### MongoDB Lineage Event Flow

1. A user submits a sample lineage event.
2. The frontend sends the event to the backend.
3. The backend checks authentication and permissions.
4. The backend validates the event information.
5. The backend checks whether the sample exists in PostgreSQL.
6. The backend stores the event in MongoDB.
7. The backend returns the result to the frontend.

## 9. Sample Lineage Architecture

Sample lineage represents the relationships between biological
samples throughout their lifecycle.

PostgreSQL stores parent-child sample relationships.

The lineage graph API retrieves sample and relationship
information for visualization.

MongoDB stores additional event history, such as collection,
processing, storage, transfer, and sequencing activities.

The frontend can use this information to display the sample
history and lineage graph.

## 10. Security Measures

The backend includes the following security measures:

- Password hashing using Argon2.
- JWT-based session authentication.
- HttpOnly session cookies.
- Secure cookie configuration in production.
- Server-side role-based authorization.
- Input validation.
- Database constraints.
- Foreign key relationships.
- Protection of restricted API operations.

Database credentials and authentication secrets should be
maintained in environment variables and must not be committed
to the public Git repository.

## 11. Advantages of the Architecture

- PostgreSQL maintains structured and consistent relational data.
- MongoDB supports flexible lineage event history.
- API routes separate frontend operations from database access.
- Authentication protects application access.
- Role-based authorization controls user permissions.
- Sample lineage supports biological sample traceability.
- The modular structure supports future development.

## 12. Conclusion

The backend architecture combines Next.js API routes,
PostgreSQL, MongoDB, and secure authentication to support
the Genomic Biobank & DNA/RNA Sample Lineage Repository.

PostgreSQL manages the primary relational records, while
MongoDB maintains additional sample lineage events.

Together, these components support donor management,
sample tracking, laboratory processing, storage,
experimentation, sequencing, and sample traceability.
