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

The project contains database-backed API functionality and frontend demonstration components.
Some interface modules may still use demonstration data.

## Related Documentation

Refer to the root README and documentation directory for setup, database schemas, API details, and architecture.
