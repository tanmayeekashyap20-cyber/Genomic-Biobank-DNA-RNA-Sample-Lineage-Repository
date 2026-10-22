import type { Edge, Node } from "@xyflow/react";
import type { DemoData } from "@/lib/types";

export type LineageKind = "donor" | "sample" | "process" | "experiment" | "result";
export interface LineageNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  kind: LineageKind;
  recordId: string;
}
export type LineageNode = Node<LineageNodeData>;
export type LineageEdge = Edge<{ relationship: string }>;
export interface LineageGraph { nodes: LineageNode[]; edges: LineageEdge[]; }

export interface LineageGraphAdapter {
  load(): Promise<LineageGraph>;
}

export function adaptDemoLineage(data: DemoData): LineageGraph {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  const ids = new Set<string>();
  const rows = new Map<LineageKind, number>();
  const yFor = (kind: LineageKind) => {
    const row = rows.get(kind) ?? 0;
    rows.set(kind, row + 1);
    return 90 + row * 105;
  };
  const columns: Record<LineageKind, number> = { donor: 20, sample: 270, process: 530, experiment: 790, result: 1050 };
  const addNode = (id: string, kind: LineageKind, label: string, subtitle: string) => {
    ids.add(id);
    nodes.push({ id, type: "graph", position: { x: columns[kind], y: yFor(kind) }, data: { kind, label, subtitle, recordId: id } });
  };
  const addEdge = (source: string, target: string, relationship: string) => {
    if (!ids.has(source) || !ids.has(target)) return;
    edges.push({
      id: `${source}-${target}-${relationship}`,
      source,
      target,
      label: relationship,
      type: "smoothstep",
      markerEnd: { type: "arrowclosed", color: "#82969b" },
      style: { stroke: "#82969b", strokeWidth: 1.5 },
      labelStyle: { fill: "#60747c", fontSize: 9 },
      labelBgStyle: { fill: "#ffffff", fillOpacity: .9 },
      data: { relationship },
    });
  };

  data.donors.forEach((donor) => addNode(donor.id, "donor", donor.id, donor.codedId));
  data.samples.forEach((sample) => addNode(sample.id, "sample", sample.id, `${sample.type} · ${sample.status}`));
  data.processing.forEach((event) => addNode(event.id, "process", event.id, event.processType));
  data.experiments.forEach((experiment) => addNode(experiment.id, "experiment", experiment.id, experiment.type));
  data.results.forEach((result) => addNode(result.id, "result", result.id, `${result.platform} · demo metric`));

  data.samples.forEach((sample) => addEdge(sample.donorId, sample.id, "collected as"));
  data.processing.forEach((event) => {
    event.inputSampleIds.forEach((sampleId) => addEdge(sampleId, event.id, "input"));
    event.outputSampleIds.forEach((sampleId) => addEdge(event.id, sampleId, "output"));
  });
  data.experiments.forEach((experiment) => experiment.sampleIds.forEach((sampleId) => addEdge(sampleId, experiment.id, "experiment sample")));
  data.results.forEach((result) => {
    addEdge(result.experimentId, result.id, "produced result");
    addEdge(result.sampleId, result.id, "result for sample");
  });
  return { nodes, edges };
}

export function createDemoLineageAdapter(data: DemoData): LineageGraphAdapter {
  return { load: async () => adaptDemoLineage(data) };
}