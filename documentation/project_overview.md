# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Project Overview

## 1. Abstract

The Genomic Biobank & DNA/RNA Sample Lineage Repository
is a database management system designed to organize
and manage biological sample information throughout
its lifecycle.

Biobanks maintain biological samples such as DNA and RNA
for research and scientific purposes. Managing donor
information, consent records, sample processing,
storage, experiments, and sequencing information
requires an organized and reliable database system.

The proposed system uses PostgreSQL as its primary
relational database to manage structured information.
MongoDB is used to maintain additional sample lineage
event history.

The application provides modules for donor management,
consent management, sample registration, researcher
management, laboratory processing, sample lineage,
storage, experiments, and sequencing results.

It also incorporates authentication and role-based
access control to restrict application operations
according to user permissions.

The main goal is to improve the organization,
management, and traceability of biological samples
within a centralized digital repository.

## 2. Problem Statement

Traditional biological sample management can involve
multiple records and complex relationships between
donors, samples, laboratory activities, storage
locations, and research experiments.

Managing these records without a centralized system
can create difficulties in:

- Maintaining donor information.
- Managing donor consent records.
- Tracking biological samples.
- Recording sample processing activities.
- Maintaining parent-child sample relationships.
- Tracking sample storage locations.
- Connecting samples with experiments.
- Managing sequencing results.
- Maintaining sample activity history.
- Controlling access to confidential information.

Therefore, a centralized database management system
is required to organize biological sample information
and maintain traceability throughout the sample lifecycle.

## 3. Project Objectives

The major objectives of this project are:

1. To develop a centralized biological sample repository.

2. To maintain donor registration information.

3. To manage donor consent records.

4. To register and maintain DNA/RNA sample information.

5. To maintain sample type information.

6. To manage researcher information.

7. To record laboratory processing activities.

8. To maintain parent-child sample lineage relationships.

9. To track sample storage locations and storage history.

10. To associate biological samples with research experiments.

11. To maintain sequencing result information.

12. To implement authentication and role-based authorization.

13. To maintain audit-related database records.

14. To use PostgreSQL and MongoDB for their respective
    data management responsibilities.

15. To improve sample traceability and data organization.

## 4. Project Scope

The project covers the following major areas.

### 4.1 Donor Management

Maintains donor registration and contact information.

### 4.2 Consent Management

Maintains consent information and consent validity periods.

### 4.3 Sample Management

Stores biological sample information, including donor
association, sample type, collection date, location,
and status.

### 4.4 Researcher Management

Maintains researcher details and associated information.

### 4.5 Laboratory Processing

Records laboratory processes and sample processing
relationships.

### 4.6 Sample Lineage

Maintains parent-child relationships between samples
to support biological sample traceability.

### 4.7 Storage Management

Maintains storage unit information and sample storage
history.

### 4.8 Experiment Management

Maintains research experiment records and their
associated biological samples.

### 4.9 Sequencing Management

Maintains sequencing-related result information.

### 4.10 User and Access Management

Supports user authentication and role-based access
for application operations.

### 4.11 Lineage Event History

Uses MongoDB to maintain additional sample lifecycle
events, including collection, processing, storage,
transfer, and sequencing.

## 5. Proposed Solution

The proposed system combines a web application
with relational and document-oriented database storage.

### PostgreSQL

PostgreSQL acts as the primary relational database.

It manages donor, consent, sample, researcher,
processing, storage, experiment, sequencing,
user, and audit information.

### MongoDB

MongoDB stores additional sample lineage event
history in the lineage_events collection.

### Next.js Backend

The backend provides API endpoints for application
operations, database communication, authentication,
and authorization.

### Frontend

The frontend provides an interface through which
users interact with the application's modules.

## 6. Expected Outcomes

The expected outcomes of the project include:

- Centralized biological sample information.
- Organized donor and consent records.
- Improved sample tracking.
- Structured laboratory processing records.
- Parent-child sample lineage management.
- Better storage record organization.
- Experiment and sequencing information management.
- Additional sample lifecycle event history.
- Controlled application access.
- Improved data integrity and traceability.

## 7. Technologies Used

The project uses the following technologies:

- Frontend: Next.js, React, TypeScript, Tailwind CSS.
- Backend: Next.js API Routes and TypeScript.
- Relational Database: PostgreSQL.
- NoSQL Database: MongoDB.
- Authentication: JWT-based sessions.
- Password Hashing: Argon2.
- Version Control: Git and GitHub.

## 8. Conclusion

The Genomic Biobank & DNA/RNA Sample Lineage Repository
provides a centralized approach to managing biological
sample information.

By combining PostgreSQL, MongoDB, and a web-based
application, the system supports donor management,
sample tracking, laboratory processing, storage,
experiments, sequencing, and lineage history.

The project aims to improve data organization,
integrity, security, and traceability in biobank
management.
