
CREATE CONSTRAINT donor_id_unique IF NOT EXISTS
FOR (d:Donor) REQUIRE d.donorId IS UNIQUE;

CREATE CONSTRAINT sample_id_unique IF NOT EXISTS
FOR (s:Sample) REQUIRE s.sampleId IS UNIQUE;

CREATE CONSTRAINT processing_id_unique IF NOT EXISTS
FOR (p:Processing) REQUIRE p.processId IS UNIQUE;

CREATE CONSTRAINT experiment_id_unique IF NOT EXISTS
FOR (e:Experiment) REQUIRE e.experimentId IS UNIQUE;

MERGE (d:Donor {donorId: 'D001'})
SET d.name = 'Demo Donor';

MERGE (s:Sample {sampleId: 'S001'})
SET s.type = 'Blood';

MERGE (p:Processing {processId: 'P001'})
SET p.method = 'DNA Extraction';

MERGE (e:Experiment {experimentId: 'E001'})
SET e.name = 'DNA Sequencing';

MERGE (d)-[:PROVIDED]->(s);
MERGE (s)-[:UNDERWENT]->(p);
MERGE (p)-[:USED_IN]->(e);
