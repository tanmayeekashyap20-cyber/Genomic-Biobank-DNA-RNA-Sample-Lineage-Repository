# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Backend Setup and Environment Configuration

## 1. Introduction

This document explains the setup and configuration
of the Genomic Biobank & DNA/RNA Sample Lineage Repository.

The application uses Next.js, PostgreSQL, and MongoDB.

## 2. Prerequisites

The following software is required:

- Node.js
- npm
- PostgreSQL
- MongoDB database or MongoDB Atlas account
- Git
- Visual Studio Code (recommended)

## 3. Project Structure

The project contains the following important directories:

- frontend/: Next.js application and backend API routes.
- sql/: PostgreSQL schema, sample data, and SQL queries.
- documentation/: Project documentation.
- screenshots/: Project screenshots.

## 4. Clone the Repository

Clone the project repository:

git clone https://github.com/tanmayeekashyap20-cyber/Genomic-Biobank-DNA-RNA-Sample-Lineage-Repository.git

Navigate to the project directory:

cd Genomic-Biobank-DNA-RNA-Sample-Lineage-Repository

## 5. Install Frontend Dependencies

Navigate to the frontend directory:

cd frontend

Install the required dependencies:

npm install

## 6. PostgreSQL Configuration

PostgreSQL is the primary relational database.

Create a database for the application.

Example database name:

genomic_biobank

The PostgreSQL connection string must be configured
using an environment variable.

Example:

DATABASE_URL=postgresql://USERNAME:PASSWORD@HOST:5432/DATABASE_NAME

Replace the placeholders with the appropriate database
username, password, host, port, and database name.

## 7. MongoDB Configuration

MongoDB stores sample lineage event history.

Example database name:

genomic_biobank

Collection name:

lineage_events

Configure the MongoDB connection using an environment variable.

Example:

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@CLUSTER_URL/DATABASE_NAME

Use the actual connection string supplied by your
MongoDB deployment.

## 8. Authentication Configuration

The application uses JWT-based authentication.

Configure a strong secret using an environment variable.

Example:

JWT_SECRET=REPLACE_WITH_A_STRONG_RANDOM_SECRET

Do not use the example placeholder as a production secret.

## 9. Environment Variables

Create an environment file named:

.env.local

The following variables may be required by the backend:

DATABASE_URL=
MONGODB_URI=
JWT_SECRET=

Additional environment variables should be added if
required by the application configuration.

Never commit .env.local to the public Git repository.

Do not share database passwords, connection strings,
or authentication secrets in documentation or screenshots.

## 10. Database Initialization

The SQL directory contains database setup files.

Important files include:

- sql/schema.sql
- sql/er_schema_dump.sql
- sql/sample_data.sql
- sql/queries.sql
- sql/advanced_features.sql

The schema file defines the PostgreSQL database structure.

The sample data file provides example records.

The queries file contains SQL queries used by the project.

The advanced features file contains additional database
features such as triggers and indexes.

Follow the database initialization order defined by
the project SQL scripts and their dependencies.

## 11. Starting the Application

Navigate to the frontend directory:

cd frontend

Install dependencies:

npm install

Start the Next.js development server:

npm run dev

The development application is normally available at:

http://localhost:3000

## 12. Application Architecture

The frontend communicates with the backend through
Next.js API routes.

The backend communicates with:

- PostgreSQL for structured relational records.
- MongoDB for lineage event history.

Authentication and authorization are handled by
the backend.

## 13. Important Security Guidelines

- Keep .env.local private.
- Never upload database credentials to GitHub.
- Use strong authentication secrets.
- Avoid storing plain-text passwords.
- Use restricted database credentials where appropriate.
- Do not expose private database connection strings.
- Rotate credentials if they are accidentally exposed.

## 14. Conclusion

This setup guide describes the main software requirements,
database configuration, environment variables, and
application startup procedure.

It provides a starting point for developers who want
to install and work with the Genomic Biobank & DNA/RNA
Sample Lineage Repository.
