"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createActivity, initialDemoData } from "@/lib/demo-data";
import type { DemoData, Donor, Experiment, ProcessingEvent, Sample, UserRole } from "@/lib/types";

interface DemoContextValue {
  data: DemoData;
  role: UserRole;
  setRole: (role: UserRole) => void;
  addDonor: (donor: Donor) => void;
  updateDonor: (donor: Donor) => void;
  addSample: (sample: Sample) => void;
  addProcessing: (event: ProcessingEvent) => void;
  addExperiment: (experiment: Experiment) => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<DemoData>(initialDemoData);
  const [role, setRoleValue] = useState<UserRole>("Administrator");

  useEffect(() => {
    const saved = sessionStorage.getItem("biobank-demo-data");
    const savedRole = sessionStorage.getItem("biobank-demo-role");
    if (saved) {
      try { setData(JSON.parse(saved) as DemoData); } catch { sessionStorage.removeItem("biobank-demo-data"); }
    }
    if (savedRole === "Administrator" || savedRole === "Researcher") setRoleValue(savedRole);
  }, []);

  useEffect(() => { sessionStorage.setItem("biobank-demo-data", JSON.stringify(data)); }, [data]);

  const setRole = (nextRole: UserRole) => {
    setRoleValue(nextRole);
    sessionStorage.setItem("biobank-demo-role", nextRole);
  };

  const update = (action: string, actor: string, apply: (current: DemoData) => DemoData) => {
    setData((current) => {
      const next = apply(current);
      return { ...next, activity: [createActivity(action, actor), ...next.activity] };
    });
  };

  const value = useMemo<DemoContextValue>(() => ({
    data,
    role,
    setRole,
    addDonor: (donor) => update(`Donor ${donor.id} registered`, role === "Administrator" ? "Demo Administrator" : "Demo Researcher", (current) => ({ ...current, donors: [donor, ...current.donors] })),
    updateDonor: (donor) => update(`Donor ${donor.id} updated`, role === "Administrator" ? "Demo Administrator" : "Demo Researcher", (current) => ({ ...current, donors: current.donors.map((entry) => entry.id === donor.id ? donor : entry) })),
    addSample: (sample) => update(`Sample ${sample.id} registered`, role === "Administrator" ? "Demo Administrator" : "Demo Researcher", (current) => ({ ...current, samples: [sample, ...current.samples] })),
    addProcessing: (event) => update(`Processing event ${event.id} recorded`, role === "Administrator" ? "Demo Administrator" : "Demo Researcher", (current) => ({ ...current, processing: [event, ...current.processing], samples: current.samples.map((sample) => event.inputSampleIds.includes(sample.id) || event.outputSampleIds.includes(sample.id) ? { ...sample, lineageAvailable: true } : sample) })),
    addExperiment: (experiment) => update(`Experiment ${experiment.id} created`, role === "Administrator" ? "Demo Administrator" : "Demo Researcher", (current) => ({ ...current, experiments: [experiment, ...current.experiments] })),
  }), [data, role]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemoData() {
  const value = useContext(DemoContext);
  if (!value) throw new Error("useDemoData must be used inside DemoDataProvider.");
  return value;
}