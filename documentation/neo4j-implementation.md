# Neo4j Implementation — Genomic Biobank

## 1. Objective
Neo4j stores the relationships between donors, biological samples, processing activities, and experiments. It enables lineage tracing across the sample lifecycle.

## 2. Graph Data Model

### Nodes
- `Donor`: donorId, name
- `Sample`: sampleId, type
- `Processing`: processId, method
- `Experiment`: experimentId, name

### Relationships
- `(Donor)-[:PROVIDED]->(Sample)`
- `(Sample)-[:UNDERWENT]->(Processing)`
- `(Processing)-[:USED_IN]->(Experiment)`

## 3. Constraints
Unique property constraints are defined for donorId, sampleId, processId, and experimentId to prevent duplicate identifiers.

## 4. Lineage Queries
Cypher queries retrieve the complete path from a donor to a sequencing experiment, count relationship types, and inspect stored nodes.

## 5. Verification
The demo graph was executed and verified in Neo4j Browser. The lineage graph contains four nodes and three relationships.

## 6. Integration Status
The Neo4j graph has been created locally. Connecting the frontend lineage explorer to the database requires integration through the project's backend API.
