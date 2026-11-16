# Genomic Biobank & DNA/RNA Sample Lineage Repository
# User Guide

## 1. Introduction

The Genomic Biobank & DNA/RNA Sample Lineage Repository
is an application designed to manage biological samples
and maintain their history throughout their lifecycle.

This guide explains the main application modules and
the responsibilities of different user roles.

## 2. Application Overview

The application supports:

- Donor management
- Consent management
- Biological sample registration
- Researcher management
- Laboratory process management
- Sample lineage tracking
- Storage management
- Experiment management
- Sequencing result management
- User authentication and authorization

## 3. User Authentication

Users access protected application features through
the authentication system.

### Login

1. Open the application.
2. Navigate to the login page.
3. Enter the registered username and password.
4. Submit the login form.
5. Access the application according to assigned permissions.

### Logout

1. Open the application interface.
2. Select the logout option.
3. The application ends the authenticated session.

## 4. Administrator Guide

The Administrator has the highest level of application access.

Administrative responsibilities include:

- Managing donor records.
- Managing consent records.
- Managing biological samples.
- Managing researcher information.
- Managing laboratory processes.
- Managing sample lineage records.
- Managing storage records.
- Managing experiments.
- Managing sequencing results.
- Accessing permitted administrative functions.
- Performing authorized deletion operations.

## 5. Researcher Guide

Researchers can access permitted research-related
application features.

Their responsibilities include:

- Viewing donor information.
- Accessing permitted consent records.
- Viewing biological sample information.
- Creating permitted records.
- Updating permitted records.
- Accessing experiment information.
- Viewing sample lineage information.
- Accessing permitted sequencing and storage records.

Researcher deletion permissions are restricted.

## 6. Lab Technician Guide

Lab Technician is a defined application role.

Access to protected application operations remains
restricted until specific permissions are assigned.

Users with this role should only receive access
approved by the application administrator.

## 7. Donor Management

The donor module stores donor registration information.

Typical donor information includes:

- Full name
- Date of birth
- Gender
- Phone number
- Email
- Address
- Registration date

Donor records are associated with biological samples
and consent information.

## 8. Consent Management

The consent module maintains donor consent records.

Consent information helps track donor permissions
and their validity periods.

Consent expiry dates must not precede consent dates.

## 9. Sample Management

The sample module maintains biological sample information.

Sample records include:

- Sample identifier
- Donor association
- Sample type
- Collection date
- Location
- Status
- Description

Samples are connected to other modules for processing,
storage, experiments, sequencing, and lineage tracking.

## 10. Researcher Management

The researcher module stores researcher details.

Information may include:

- Full name
- Department
- Professional role
- Email
- Phone number

Researchers can be associated with experiments.

## 11. Laboratory Process Management

The process module stores laboratory procedures.

The sample processing module records input and output
sample relationships associated with laboratory processes.

This supports tracking of sample transformations.

## 12. Sample Lineage Management

Sample lineage maintains parent-child relationships
between biological samples.

This helps users understand how samples are related
and trace their origins.

The lineage graph API provides information that can
be used for visualizing sample relationships.

MongoDB lineage events provide additional sample
lifecycle history.

## 13. Storage Management

The storage module maintains storage unit information.

The sample storage module connects biological samples
with their storage locations.

Storage dates and removal dates help maintain
sample storage history.

## 14. Experiment Management

The experiment module stores research experiment records.

Experiments can be associated with researchers
and biological samples.

The experiment-sample relationship supports the
association of multiple samples with experiments.

## 15. Sequencing Result Management

The sequencing result module maintains information
about sequencing activities and their associated samples.

This supports the organization and retrieval of
sequencing-related records.

## 16. Security and Access Control

Application access is controlled through authentication
and role-based authorization.

Important security features include:

- Argon2 password hashing.
- JWT-based session authentication.
- Secure session cookies.
- Server-side authorization checks.
- Restricted administrative operations.

Users should never share their passwords or
private authentication credentials.

## 17. Important User Guidelines

- Enter accurate donor information.
- Maintain valid consent records.
- Associate samples with the correct donors.
- Preserve sample lineage relationships.
- Keep storage information updated.
- Maintain accurate experiment information.
- Protect confidential biological sample information.
- Log out after completing application work.

## 18. Conclusion

The application provides a centralized system for
managing donor information, consent, biological samples,
laboratory processes, lineage, storage, experiments,
and sequencing results.

The user guide describes the main modules and
role responsibilities of the application.
