import type { Edge, Node } from "@xyflow/react";

export type LineageKind =
  | "donor"
  | "sample"
  | "process"
  | "experiment"
  | "result";

export interface LineageNodeData extends Record<string, unknown> {
  label: string;
  subtitle: string;
  kind: LineageKind;
  recordId: string;
}

export type LineageNode = Node<LineageNodeData>;

export type LineageEdge = Edge<{ relationship: string }>;

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}
