# Functional and Non-Functional Requirements

## 1. Introduction

This document describes the functional and non-functional requirements of the Genomic Biobank & DNA/RNA Sample Lineage Repository. It defines the expected system capabilities and the quality attributes that guide its design and development.

## 2. Functional Requirements

### FR-01: User Authentication
- The system shall allow registered users to log in using their credentials.
- The system shall validate user credentials before granting access.
- The system shall allow authenticated users to log out.
- The system shall maintain the user's authenticated session securely.

### FR-02: Role-Based Access Control
- The system shall support role-based access for authorized users.
- The system shall distinguish between Administrator, Researcher, and Lab Technician roles.
- The system shall restrict operations according to the permissions assigned to each role.
- The system shall prevent unauthorized users from accessing protected operations.

### FR-03: Donor Management
- The system shall support the registration of donor records.
- The system shall allow authorized users to view donor information.
- The system shall support updating donor information.
- The system shall restrict donor record deletion to authorized roles.

### FR-04: Consent Management
- The system shall maintain consent records associated with donors.
- The system shall allow authorized users to view and manage consent information.
- The system shall validate consent dates and expiry dates.
- The system shall preserve the relationship between donors and their consent records.

### FR-05: Sample Management
- The system shall support registration of biological samples.
- The system shall maintain sample identifiers and sample-related metadata.
- The system shall associate samples with their respective donors.
- The system shall support viewing and updating sample records.
- The system shall validate sample information before saving records.

### FR-06: Sample Type Management
- The system shall maintain sample type information.
- The system shall associate samples with their corresponding sample types.

### FR-07: Sample Processing
- The system shall maintain records of sample processing activities.
- The system shall record relevant processing information and relationships between input and output samples.
- The system shall validate processing records before saving them.

### FR-08: Sample Lineage Tracking
- The system shall maintain relationships between parent and child samples.
- The system shall support retrieval of sample lineage information.
- The system shall prevent a sample from being recorded as its own parent.
- The system shall provide lineage information for visualization and tracking.

### FR-09: Storage Management
- The system shall maintain storage unit information.
- The system shall record sample storage details.
- The system shall support tracking of sample storage and removal information.
- The system shall validate storage dates and related records.

### FR-10: Experiment Management
- The system shall support creation and management of experiment records.
- The system shall maintain experiment dates and associated metadata.
- The system shall associate samples with experiments.
- The system shall validate experiment date ranges.

### FR-11: Sequencing Result Management
- The system shall maintain sequencing result records associated with samples.
- The system shall allow authorized users to retrieve and manage sequencing result information.

### FR-12: MongoDB Lineage Event Management
- The system shall store supported lineage event records in MongoDB.
- The system shall validate lineage event information before storage.
- The system shall verify the associated sample against the PostgreSQL database before creating a lineage event.
- The system shall support retrieval of stored lineage events.

### FR-13: Audit and Data Integrity
- The system shall maintain audit information for supported database operations.
- The system shall enforce database constraints to protect data integrity.
- The system shall reject invalid records that violate defined validation rules or database constraints.

### FR-14: Data Retrieval
- The system shall provide authorized users with access to relevant donor, consent, sample, processing, lineage, storage, experiment, and sequencing information.
- The system shall support retrieval of sample lineage information for the application interface.

## 3. Non-Functional Requirements

### NFR-01: Security
- The system should protect authenticated sessions and credentials.
- Passwords shall not be stored as plain text.
- Protected API operations shall enforce authorization checks.
- Sensitive configuration values shall be kept outside source code.

### NFR-02: Privacy
- Donor and biological sample information should only be accessible to authorized users.
- The system should avoid exposing sensitive information through unauthorized API responses.

### NFR-03: Data Integrity
- The system shall use appropriate database constraints and validation.
- Relationships between donors, samples, consent records, experiments, and lineage records shall remain consistent.
- Invalid date ranges and invalid sample relationships shall be rejected.

### NFR-04: Performance
- Common record retrieval and management operations should complete within a reasonable time under the expected project workload.
- Database queries should use appropriate indexes where beneficial.

### NFR-05: Usability
- The application should provide a clear and understandable interface.
- Forms should communicate validation errors in a useful manner.
- Navigation should allow users to locate the main project modules easily.

### NFR-06: Maintainability
- The application should use a modular structure that separates interface, API, and database responsibilities.
- Database schemas and API behavior should be documented.
- Code should be organized to support future maintenance and enhancement.

### NFR-07: Reliability
- The system should handle invalid input and database errors gracefully.
- Failed operations should not leave partially created or inconsistent records.
- Database operations should preserve defined integrity constraints.

### NFR-08: Scalability
- The architecture should allow future growth in donor, sample, experiment, and lineage records.
- The data model should support future expansion of sample types and processing workflows.

### NFR-09: Compatibility
- The web application should support modern browsers.
- The application should operate in the configured project development environment.

### NFR-10: Backup and Recovery
- Database backup procedures should be established for project data.
- Recovery procedures should be documented to support restoration after data loss or failure.

## 4. Requirement Priorities

The following priorities describe the general importance of the requirements:

| Priority | Meaning |
|---|---|
| High | Essential for the core operation or protection of the system |
| Medium | Important for usability, maintainability, or supporting workflows |
| Future | A recommended capability for later enhancement |

Authentication, authorization, donor and sample management, data integrity, and lineage tracking are considered core project requirements. Additional improvements may be prioritized according to project scope and available resources.

## 5. Conclusion

These functional and non-functional requirements provide a reference for the design, implementation, documentation, and future enhancement of the Genomic Biobank & DNA/RNA Sample Lineage Repository. They describe the expected system behavior and quality goals without assuming that every proposed capability is already fully implemented.
