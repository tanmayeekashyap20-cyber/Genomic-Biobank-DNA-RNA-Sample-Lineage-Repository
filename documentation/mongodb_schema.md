\# MongoDB Schema Documentation



\## 1. Overview



The Genomic Biobank project uses MongoDB to store sample lineage events.



MongoDB stores event history associated with samples, while PostgreSQL stores the main relational sample records.



\*\*Database:\*\* `genomic\_biobank`  

\*\*Collection:\*\* `lineage\_events`



\## 2. MongoDB Connection



The MongoDB connection is implemented in:



`frontend/src/lib/mongodb.ts`



The application reads the connection string from the `MONGODB\_URI` environment variable defined in `.env.local`.



The MongoDB Node.js driver is used to create a client connection.



During development, the connection promise is cached using `globalThis` to support connection reuse.



The application uses the Node.js runtime for MongoDB API operations.



\## 3. Collection: lineage\_events



The `lineage\_events` collection stores sample lineage and activity events.



\### Document fields



| Field | Data type | Description |

|---|---|---|

| `\_id` | MongoDB ObjectId | Automatically generated unique document identifier |

| `sampleId` | Number | PostgreSQL sample ID associated with the event |

| `eventType` | String | Type of lineage event |

| `description` | String | Description of the event |

| `eventDate` | Date | Date and time when the event occurred |

| `performedBy` | String | Person associated with performing the event; optional |

| `createdAt` | Date | Date and time when the event was created |



The `eventDate` defaults to the current date and time when it is not provided.



The `createdAt` field is assigned the current date and time when the event is inserted.



\## 4. Event Types



The application accepts the following event types:



\- `collected`

\- `processed`

\- `stored`

\- `transferred`

\- `sequenced`



The event type is validated using a predefined enumeration.



\## 5. Validation Rules



The application validates lineage-event data before inserting it into MongoDB.



| Field | Validation |

|---|---|

| `sampleId` | Must be a positive integer |

| `eventType` | Must be one of the five supported event types |

| `description` | Required; trimmed; minimum 3 and maximum 500 characters |

| `eventDate` | Optional; must be a valid datetime with timezone offset |

| `performedBy` | Optional; trimmed; minimum 1 and maximum 100 characters |



Before insertion, the application checks PostgreSQL to confirm that the specified sample exists.



If the sample does not exist, the API returns a `404` response and does not insert the event.



\## 6. API Operations



The MongoDB collection is accessed through:



`frontend/app/api/lineage-events/route.ts`



\### GET — Retrieve lineage events



The GET operation:



1\. Checks authentication and authorization.

2\. Connects to the `genomic\_biobank` database.

3\. Reads documents from `lineage\_events`.

4\. Sorts documents by `createdAt` in descending order.

5\. Returns at most 100 events.

6\. Converts MongoDB ObjectIds to strings in the response.



\### POST — Create lineage event



The POST operation:



1\. Checks authentication and authorization.

2\. Parses the request JSON.

3\. Validates the event using the Zod schema.

4\. Checks whether the sample exists in PostgreSQL.

5\. Creates the event date and creation timestamp.

6\. Inserts the event into MongoDB.

7\. Returns the created event and its MongoDB ID.



The API returns HTTP `201` when an event is successfully created.



\## 7. Authentication and Authorization



The lineage-events API requires an authenticated user.



The following roles are permitted:



\- Admin

\- Researcher



Unauthenticated requests receive HTTP `401`.



Users without an authorized role receive HTTP `403`.



The authorization logic is implemented using `getAuthenticatedUser()` and `hasRole()` from the application's authentication module.



\## 8. PostgreSQL and MongoDB Integration



MongoDB lineage events reference samples stored in PostgreSQL using the `sampleId` field.



Before creating a lineage event, the application executes a PostgreSQL query against the `public.sample` table.



This verifies that the referenced sample exists.



The sample record remains in PostgreSQL, while the lineage event is stored in MongoDB.



This provides an application-level relationship between the two databases.



\## 9. Error Handling



The lineage-events API handles the following conditions:



\- Missing authentication

\- Insufficient role permissions

\- Invalid JSON request body

\- Invalid lineage-event fields

\- Sample not found in PostgreSQL

\- MongoDB retrieval or insertion errors



The API returns appropriate HTTP status codes and error messages.



\## 10. Implementation Files



| File | Responsibility |

|---|---|

| `frontend/src/lib/mongodb.ts` | MongoDB client connection |

| `frontend/app/api/lineage-events/route.ts` | Lineage-event retrieval and creation |

| `frontend/src/lib/auth.ts` | Authentication and role authorization |

| `.env.local` | Local environment configuration containing the MongoDB connection string |



\## 11. Limitations of the Current Implementation



The inspected implementation provides lineage-event retrieval and creation.



The following features are not demonstrated by the inspected files:



\- MongoDB lineage-event update operations

\- MongoDB lineage-event deletion operations

\- Explicit MongoDB collection indexes

\- MongoDB schema validation configured at the database level

\- Automatic synchronization of PostgreSQL sample changes with MongoDB events



The application validates event data before insertion and verifies the referenced PostgreSQL sample.



These observations describe the inspected implementation and do not establish whether additional MongoDB features exist elsewhere in the project.

