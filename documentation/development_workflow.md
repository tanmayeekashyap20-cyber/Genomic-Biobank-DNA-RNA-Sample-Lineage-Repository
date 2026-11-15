# Project Development Workflow

## 1. Introduction

This document describes the development workflow followed for the Genomic Biobank & DNA/RNA Sample Lineage Repository, including team responsibilities, source control practices, and the integration process.

## 2. Team Responsibilities

### Person 1 – Database and Backend Lead
Responsibilities:
- Design and maintain PostgreSQL database schemas.
- Implement backend API routes and CRUD operations.
- Manage MongoDB lineage event operations.
- Implement authentication and role-based authorization.
- Maintain database constraints and data integrity.
- Prepare backend and database documentation.

### Person 2 – Frontend and Application Lead
Responsibilities:
- Develop and maintain the frontend interface.
- Integrate frontend components with backend APIs.
- Implement forms and record-management screens.
- Develop login and logout interface elements.
- Display information according to user roles.
- Prepare frontend documentation and screenshots.

### Shared Responsibilities
- Review project requirements.
- Coordinate frontend and backend integration.
- Maintain project documentation.
- Review changes before merging.
- Prepare the final demonstration and presentation.

## 3. Development Workflow

The general development workflow is:

1. Review the project requirements.
2. Divide implementation tasks between team members.
3. Design database structures and application components.
4. Implement backend APIs and frontend features.
5. Integrate frontend components with backend services.
6. Review implementation and resolve integration issues.
7. Update documentation.
8. Prepare the final project demonstration.

## 4. Git and GitHub Workflow

Git and GitHub are used for source-code version control and collaboration.

The recommended workflow is:

1. Keep the main project branch stable.
2. Create separate feature branches for independent tasks.
3. Commit related changes with descriptive commit messages.
4. Push completed work to the remote repository.
5. Review changes before merging them into the shared branch.
6. Keep documentation updated alongside implementation changes.

## 5. Branch Management

Feature branches allow team members to work on separate parts of the application without directly changing the shared branch.

Examples of project branches include:
- `feature/backend-postgres`
- `feature/neo4j-lineage`
- `feature/mongodb-lineage`

The team should confirm the intended final integration branch and required database technologies before preparing the final submission.

## 6. Frontend and Backend Integration

The frontend communicates with backend services through API endpoints.

The integration process involves:
- Agreeing on API endpoint paths and HTTP methods.
- Agreeing on request and response field names.
- Handling API responses and errors in the frontend.
- Applying role-based access restrictions.
- Connecting the user interface to the intended database-backed operations.

## 7. Documentation Practices

Project documentation is maintained in the `documentation` directory.

Documentation should describe the actual implementation, database structures, API behavior, setup requirements, limitations, and future improvements.

Any proposed or incomplete feature should be identified clearly rather than presented as a completed implementation.

## 8. Conclusion

A structured development workflow supports collaboration, version control, frontend and backend integration, and consistent project documentation. Clear task ownership and regular coordination help the team prepare a maintainable and understandable project.
