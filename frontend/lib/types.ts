export type UserRole = "Administrator" | "Researcher" | "Lab Technician";
export type SampleType = "DNA" | "RNA" | "Other";
export type SampleStatus = "Available" | "Processing" | "Archived" | "Depleted";

export interface Donor {
  id: string;
  codedId: string;
  consentStatus: "Active" | "Pending" | "Withdrawn";
  registeredAt: string;
  cohort: string;
  ageBand: string;
}

export interface Sample {
  id: string;
  donorId: string;
  type: SampleType;
  collectionDate: string;
  status: SampleStatus;
  storageUnitId: string;
  lineageAvailable: boolean;
}

export interface ProcessingEvent {
  id: string;
  processType: string;
  date: string;
  researcher: string;
  inputSampleIds: string[];
  outputSampleIds: string[];
}

export interface Experiment {
  id: string;
  researcher: string;
  type: string;
  startDate: string;
  endDate: string;
  sampleIds: string[];
  status: "Planned" | "In progress" | "Complete" | "On hold";
}

export interface SequencingResult {
  id: string;
  sampleId: string;
  experimentId: string;
  platform: string;
  readCount: number;
  qualityScore: number;
  status: "Complete" | "In review";
}

export interface StorageUnit {
  id: string;
  name: string;
  location: string;
  capacity: number;
  occupied: number;
  status: "Operational" | "Maintenance";
}

export interface Activity {
  id: string;
  timestamp: string;
  action: string;
  actor: string;
}

export interface DatabaseSample {
  sample_id: string;
  donor_id: string;
  sample_type_name: string;
  collection_date: string;
  collection_location: string | null;
  status: string;
  description: string | null;
  storage_locations: {
    storage_id: number;
    freezer_id: string;
    rack_no: string;
    box_no: string;
    position: string;
    temperature: number | null;
    storage_status: string;
    stored_date: string;
    removed_date: string | null;
  }[] | null;
  lineage_children: {
    related_sample_id: number;
    relationship_type: string;
    direction: "child";
  }[] | null;
  lineage_parents: {
    related_sample_id: number;
    relationship_type: string;
    direction: "parent";
  }[] | null;
}
export interface DatabaseDonor {
  donor_id: string;
  full_name: string;
}
/* PostgreSQL-backed record types */

export interface DatabaseConsent {
  consent_id: string;
  donor_id: string;
  donor_name?: string;
  consent_type: string;
  consent_date: string;
  expiry_date: string | null;
  status: string;
  description: string | null;
}

export interface DatabaseProcess {
  process_id: string;
  process_type: string;
  process_date: string;
  performed_by: string;
  researcher_name: string;
  description: string | null;
}

export interface DatabaseSampleProcess {
  sample_process_id: string;
  process_id: string;
  process_type: string;
  input_sample_id: string;
  output_sample_id: string;
  quantity: number | null;
  unit: string | null;
}

export interface DatabaseExperiment {
  experiment_id: string;
  experiment_name: string;
  experiment_type: string | null;
  start_date: string | null;
  end_date: string | null;
  researcher_id: string;
  researcher_name: string;
  status: string;
  description: string | null;
}

export interface DatabaseExperimentSample {
  experiment_sample_id: string;
  experiment_id: string;
  experiment_name: string;
  sample_id: string;
  sample_status: string;
  date_added: string;
  notes: string | null;
}

export interface DatabaseSequencingResult {
  sequencing_result_id: string;
  sample_id: string;
  experiment_id: string | null;
  sequencing_platform: string | null;
  run_date: string | null;
  file_path: string | null;
  result_status: string;
  notes: string | null;
  experiment_name: string | null;
  sample_status: string;
}

export interface DatabaseStorageUnit {
  storage_id: string;
  freezer_id: string | null;
  rack_no: string | null;
  box_no: string | null;
  position: string | null;
  temperature: number | null;
  status: string;
}

export interface DatabaseSampleStorage {
  sample_storage_id: string;
  sample_id: string;
  storage_id: string;
  stored_date: string;
  removed_date: string | null;
  freezer_id: string | null;
  rack_no: string | null;
  box_no: string | null;
  position: string | null;
  temperature: number | null;
  storage_status: string;
}


