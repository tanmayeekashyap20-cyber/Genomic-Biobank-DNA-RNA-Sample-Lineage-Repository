export type UserRole = "Administrator" | "Researcher";
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

export interface DemoData {
  donors: Donor[];
  samples: Sample[];
  processing: ProcessingEvent[];
  experiments: Experiment[];
  results: SequencingResult[];
  storage: StorageUnit[];
  activity: Activity[];
}