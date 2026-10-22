import type { Activity, DemoData } from "@/lib/types";

export const initialDemoData: DemoData = {
  donors: [
    { id: "DNR-2401", codedId: "BIO-C-1042", consentStatus: "Active", registeredAt: "2026-01-08", cohort: "Cohort A", ageBand: "40-49" },
    { id: "DNR-2402", codedId: "BIO-C-1043", consentStatus: "Active", registeredAt: "2026-01-11", cohort: "Cohort B", ageBand: "50-59" },
    { id: "DNR-2403", codedId: "BIO-C-1044", consentStatus: "Pending", registeredAt: "2026-01-18", cohort: "Cohort A", ageBand: "30-39" },
    { id: "DNR-2404", codedId: "BIO-C-1045", consentStatus: "Active", registeredAt: "2026-02-02", cohort: "Cohort C", ageBand: "60-69" },
    { id: "DNR-2405", codedId: "BIO-C-1046", consentStatus: "Active", registeredAt: "2026-02-14", cohort: "Cohort B", ageBand: "40-49" },
    { id: "DNR-2406", codedId: "BIO-C-1047", consentStatus: "Withdrawn", registeredAt: "2026-02-20", cohort: "Cohort C", ageBand: "30-39" },
  ],
  samples: [
    { id: "SMP-5101", donorId: "DNR-2401", type: "DNA", collectionDate: "2026-01-10", status: "Available", storageUnitId: "ST-01", lineageAvailable: true },
    { id: "SMP-5102", donorId: "DNR-2401", type: "RNA", collectionDate: "2026-01-10", status: "Available", storageUnitId: "ST-01", lineageAvailable: true },
    { id: "SMP-5103", donorId: "DNR-2402", type: "DNA", collectionDate: "2026-01-12", status: "Processing", storageUnitId: "ST-02", lineageAvailable: true },
    { id: "SMP-5104", donorId: "DNR-2402", type: "Other", collectionDate: "2026-01-12", status: "Available", storageUnitId: "ST-02", lineageAvailable: false },
    { id: "SMP-5105", donorId: "DNR-2403", type: "RNA", collectionDate: "2026-01-19", status: "Available", storageUnitId: "ST-03", lineageAvailable: false },
    { id: "SMP-5106", donorId: "DNR-2404", type: "DNA", collectionDate: "2026-02-04", status: "Archived", storageUnitId: "ST-01", lineageAvailable: true },
    { id: "SMP-5107", donorId: "DNR-2405", type: "DNA", collectionDate: "2026-02-16", status: "Available", storageUnitId: "ST-02", lineageAvailable: false },
    { id: "SMP-5108", donorId: "DNR-2405", type: "RNA", collectionDate: "2026-02-16", status: "Processing", storageUnitId: "ST-03", lineageAvailable: true },
    { id: "SMP-5109", donorId: "DNR-2406", type: "Other", collectionDate: "2026-02-22", status: "Depleted", storageUnitId: "ST-03", lineageAvailable: false },
    { id: "SMP-5110", donorId: "DNR-2401", type: "DNA", collectionDate: "2026-03-02", status: "Available", storageUnitId: "ST-01", lineageAvailable: true },
  ],
  processing: [
    { id: "PRC-301", processType: "DNA extraction", date: "2026-01-12", researcher: "Dr. A. Morgan", inputSampleIds: ["SMP-5101"], outputSampleIds: ["SMP-5103"] },
    { id: "PRC-302", processType: "RNA aliquoting", date: "2026-02-18", researcher: "J. Chen", inputSampleIds: ["SMP-5108"], outputSampleIds: ["SMP-5110"] },
  ],
  experiments: [
    { id: "EXP-701", researcher: "Dr. A. Morgan", type: "Whole genome sequencing", startDate: "2026-01-20", endDate: "2026-01-24", sampleIds: ["SMP-5103", "SMP-5106"], status: "Complete" },
    { id: "EXP-702", researcher: "J. Chen", type: "RNA quality assessment", startDate: "2026-03-05", endDate: "2026-03-10", sampleIds: ["SMP-5102", "SMP-5108"], status: "In progress" },
    { id: "EXP-703", researcher: "R. Patel", type: "Library preparation", startDate: "2026-03-16", endDate: "2026-03-18", sampleIds: ["SMP-5101"], status: "Planned" },
  ],
  results: [
    { id: "SEQ-901", sampleId: "SMP-5103", experimentId: "EXP-701", platform: "NovaSeq 6000", readCount: 94200000, qualityScore: 94.8, status: "Complete" },
    { id: "SEQ-902", sampleId: "SMP-5106", experimentId: "EXP-701", platform: "NovaSeq 6000", readCount: 88700000, qualityScore: 92.1, status: "In review" },
  ],
  storage: [
    { id: "ST-01", name: "Cryogenic Unit A", location: "Building 2 · Level -1", capacity: 500, occupied: 382, status: "Operational" },
    { id: "ST-02", name: "Freezer Unit B", location: "Building 2 · Room 114", capacity: 300, occupied: 224, status: "Operational" },
    { id: "ST-03", name: "Freezer Unit C", location: "Building 1 · Room 208", capacity: 250, occupied: 198, status: "Maintenance" },
  ],
  activity: [
    { id: "ACT-01", timestamp: "2026-03-18T10:42:00", action: "Experiment EXP-703 planned", actor: "R. Patel" },
    { id: "ACT-02", timestamp: "2026-03-18T09:18:00", action: "Sequencing result SEQ-902 added", actor: "J. Chen" },
    { id: "ACT-03", timestamp: "2026-03-17T16:04:00", action: "Sample SMP-5110 registered", actor: "Dr. A. Morgan" },
    { id: "ACT-04", timestamp: "2026-03-17T14:21:00", action: "Processing event PRC-302 recorded", actor: "J. Chen" },
    { id: "ACT-05", timestamp: "2026-03-16T11:35:00", action: "Donor DNR-2406 registered", actor: "R. Patel" },
  ],
};

export function createActivity(action: string, actor: string): Activity {
  return { id: `ACT-${Date.now()}`, timestamp: new Date().toISOString(), action, actor };
}