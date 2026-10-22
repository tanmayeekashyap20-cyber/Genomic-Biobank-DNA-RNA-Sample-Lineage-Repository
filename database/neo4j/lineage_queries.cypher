MATCH path =
  (d:Donor {donorId: 'D001'})
  -[:PROVIDED]->
  (s:Sample {sampleId: 'S001'})
  -[:UNDERWENT]->
  (p:Processing {processId: 'P001'})
  -[:USED_IN]->
  (e:Experiment {experimentId: 'E001'})
RETURN path;

SHOW CONSTRAINTS;

MATCH ()-[r]->()
RETURN type(r) AS relationshipType, count(r) AS total
ORDER BY relationshipType;