# Genomic Biobank & DNA/RNA Sample Lineage Repository
# Authentication and Role-Based Access Control Documentation

## 1. Introduction

Authentication and authorization are important security
features of the Genomic Biobank & DNA/RNA Sample Lineage
Repository.

Authentication identifies users accessing the application.

Authorization determines which operations an authenticated
user is permitted to perform.

The backend implements secure login, session management,
password hashing, and role-based API access control.

## 2. Authentication Architecture

The application uses the following technologies:

- Argon2 for password hashing.
- JWT for session authentication.
- jose for JWT handling.
- HTTP cookies for session management.
- Next.js API routes for authentication endpoints.

## 3. User Login

The login process works as follows:

1. The user submits a username and password.
2. The frontend sends the login request to the backend.
3. The backend retrieves the user account from PostgreSQL.
4. The submitted password is checked against the stored
   Argon2 password hash.
5. If the credentials are valid and the account is active,
   the backend creates a JWT session.
6. The session is stored in a secure cookie.
7. The user can access permitted application features.

Invalid credentials are rejected by the backend.

## 4. Password Security

Passwords are stored using Argon2 password hashing.

Plain-text passwords should never be stored in the database.

Password hashing helps protect user credentials if
database information is exposed.

## 5. Session Management

The application uses JWT-based session authentication.

The session cookie is named:

biobank-session

Cookie security properties include:

- HttpOnly: Prevents JavaScript access to the cookie.
- Secure: Enabled in production.
- SameSite=Lax: Provides cross-site request protection.
- Path=/: Makes the cookie available throughout the application.

The session duration is eight hours.

The backend checks the current user account and role
when processing protected requests.

## 6. Authentication API Endpoints

### POST /api/auth/login

Purpose:
Authenticates a user and creates a session.

### POST /api/auth/logout

Purpose:
Ends the user's session by clearing the session cookie.

### GET /api/auth/me

Purpose:
Returns the current authenticated user's information.

If a valid session is not available, the endpoint
returns an unauthorized response.

## 7. Application Roles

The application defines three roles.

### 7.1 Administrator

The Administrator has the highest level of application access.

Permissions include:
- View permitted records.
- Create records.
- Update records.
- Delete permitted records.
- Access administrative functions.
- Manage application resources.

### 7.2 Researcher

The Researcher has access to permitted research operations.

Permissions include:
- View permitted research records.
- Create permitted records.
- Update permitted records.
- Access sample and experiment information.
- View permitted lineage information.

Deletion operations are restricted to Administrators.

### 7.3 Lab Technician

Lab Technician is a separate application role.

Access to protected API operations is denied until
specific permissions are defined and implemented.

This prevents the role from receiving permissions
that have not been approved.

## 8. Role-Based Access Control

Role-based access control (RBAC) determines which
operations each user can perform.

The backend checks user permissions before allowing
protected operations.

The general access policy is:

| Operation | Administrator | Researcher | Lab Technician |
|---|---|---|---|
| View permitted records | Yes | Yes | No |
| Create permitted records | Yes | Yes | No |
| Update permitted records | Yes | Yes | No |
| Delete permitted records | Yes | No | No |
| Protected API access | According to policy | According to policy | Denied |

The permissions are enforced on the server side.

Hiding a button in the frontend is not considered
sufficient security.

## 9. Protected API Resources

The backend applies role-based authorization to
the following resources:

- Donors
- Consents
- Researchers
- Samples
- Sample lineage
- Processes
- Sample processes
- Experiments
- Experiment samples
- Sequencing results
- Storage units
- Sample storage
- Lineage events
- Lineage graph
- Sample options

Administrative database diagnostic endpoints are
restricted to Administrators.

## 10. Security Practices

The application follows these security practices:

- Store password hashes instead of plain-text passwords.
- Authenticate users before protected operations.
- Enforce authorization inside backend API routes.
- Use secure session cookies.
- Check whether user accounts are active.
- Recheck current user roles for protected requests.
- Keep database credentials in environment variables.
- Never commit passwords, JWT secrets, or database
  credentials to the public Git repository.

## 11. Unauthorized Access

The backend rejects requests when:

- The user is not authenticated.
- The session is invalid or expired.
- The account is inactive.
- The user's role does not have permission
  for the requested operation.

Unauthorized requests receive an appropriate
HTTP error response.

## 12. Conclusion

Authentication and role-based authorization protect
the Genomic Biobank & DNA/RNA Sample Lineage Repository.

Argon2 protects stored passwords, JWT supports
session authentication, and backend permission checks
restrict access to application resources.

These mechanisms help maintain confidentiality,
accountability, and controlled access to biological
sample information.
