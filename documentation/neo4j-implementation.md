# Neo4j Implementation — Genomic Biobank

## 1. Objective

Neo4j stores relationships between donors, biological samples, processing activities, and experiments. It enables lineage tracing across the sample lifecycle.

## 2. Graph Data Model

### Nodes

- `Donor`: `donorId`, `name`
- `Sample`: `sampleId`, `type`
- `Processing`: `processId`, `method`
- `Experiment`: `experimentId`, `name`

### Relationships

- `(Donor)-[:PROVIDED]->(Sample)`
- `(Sample)-[:UNDERWENT]->(Processing)`
- `(Processing)-[:USED_IN]->(Experiment)`

## 3. Constraints

Unique property constraints are defined for `donorId`, `sampleId`, `processId`, and `experimentId` to prevent duplicate identifiers.

## 4. Cypher Scripts

- `database/neo4j/lineage_setup.cypher` defines the uniqueness constraints, creates or updates the demo nodes using `MERGE`, and establishes the lineage relationships.
- `database/neo4j/lineage_queries.cypher` contains queries to verify the lineage path, inspect constraints, and count relationship types.

## 5. Verification and Results

The demo graph was executed and verified in Neo4j Browser.

Expected demo graph:

- 4 nodes: one `Donor`, one `Sample`, one `Processing`, and one `Experiment`.
- 3 relationships: `PROVIDED`, `UNDERWENT`, and `USED_IN`.
- 4 uniqueness constraints.

The lineage query successfully returned the complete path from the donor to the experiment.

## 6. Frontend Status

The dashboard and Sample Lineage Explorer load successfully in the Next.js frontend. The current frontend uses synthetic demo data. The Lineage Explorer indicates that Neo4j is not connected.

## 7. Integration Status

The Neo4j demo graph has been created and verified locally. Live frontend integration remains pending. The frontend should retrieve lineage data through the project's backend API once the backend endpoint and response format are agreed upon with the backend developer.

## 8. Security Note

Database credentials must remain private and must not be committed to GitHub. Use environment variables for credentials when configuring a live backend connection.
