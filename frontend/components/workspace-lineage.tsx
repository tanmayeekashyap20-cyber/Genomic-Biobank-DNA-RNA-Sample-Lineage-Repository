"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Background, Controls, MiniMap, ReactFlow, type NodeProps, Handle, Position, useEdgesState, useNodesState } from "@xyflow/react";
import { Search } from "lucide-react";
import { useDemoData } from "@/components/demo-data-provider";
import { Badge, EmptyState, Notice, PageHeading, Panel } from "@/components/ui";
import { createDemoLineageAdapter, type LineageEdge, type LineageGraph, type LineageKind, type LineageNode, type LineageNodeData } from "@/lib/lineage-adapter";

type Kind = LineageKind;
type GraphNode = LineageNode;

const nodeColors: Record<Kind, string> = { donor: "#617d90", sample: "#168b82", process: "#c18b35", experiment: "#6d79a2", result: "#b46d69" };
const nodeLabels: Record<Kind, string> = { donor: "Donor", sample: "Sample", process: "Processing", experiment: "Experiment", result: "Sequencing" };

function GraphCard({ data, selected }: NodeProps<GraphNode>) {
  const color = nodeColors[data.kind];
  return <div style={{ minWidth: 150, maxWidth: 180, padding: "10px 12px", border: `1px solid ${selected ? color : "#dce6e6"}`, borderLeft: `4px solid ${color}`, borderRadius: 5, background: "white", boxShadow: selected ? `0 0 0 2px ${color}28` : "0 2px 7px #132c3812" }}><Handle type="target" position={Position.Left} style={{ background: color }} /><div style={{ color, fontSize: 8, fontWeight: 700, letterSpacing: .8, textTransform: "uppercase" }}>{nodeLabels[data.kind]}</div><div style={{ marginTop: 4, color: "#183342", fontSize: 11, fontWeight: 700 }}>{data.label}</div><div style={{ marginTop: 3, color: "#73858d", fontSize: 9 }}>{data.subtitle}</div><Handle type="source" position={Position.Right} style={{ background: color }} /></div>;
}

const graphNodeTypes = { graph: GraphCard };

export function LineageExplorer() {
  const { data } = useDemoData();
  const adapter = useMemo(() => createDemoLineageAdapter(data), [data]);
  const [graph, setGraph] = useState<LineageGraph>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<GraphNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<LineageEdge>([]);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [query, setQuery] = useState("");
  const [enabled, setEnabled] = useState<Record<Kind, boolean>>({ donor: true, sample: true, process: true, experiment: true, result: true });
  const [relationshipFilter, setRelationshipFilter] = useState("All");

  useEffect(() => {
    let active = true;
    setGraphLoading(true);
    setGraphError("");
    adapter.load().then((loaded) => { if (active) setGraph(loaded); }).catch((reason: unknown) => { if (active) setGraphError(reason instanceof Error ? reason.message : "Unable to load lineage data."); }).finally(() => { if (active) setGraphLoading(false); });
    return () => { active = false; };
  }, [adapter]);

  useEffect(() => {
    const visible = graph.nodes.filter((node) => enabled[node.data.kind]);
    const ids = new Set(visible.map((node) => node.id));
    setNodes(visible.map((node) => ({ ...node, hidden: false })));
    setEdges(graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target) && (relationshipFilter === "All" || edge.data?.relationship === relationshipFilter)));
  }, [enabled, graph, relationshipFilter, setEdges, setNodes]);

  const selectNode = useCallback((node: GraphNode) => setSelected(node), []);
  const searchSample = () => {
    const found = nodes.find((node) => node.data.kind === "sample" && node.data.label.toLowerCase() === query.trim().toLowerCase());
    if (found) setSelected(found);
    else setSelected(null);
  };
  const traceSamples = (direction: "upstream" | "downstream") => {
    if (!selectedSample) return [];
    const visited = new Set<string>([selectedSample.id]);
    const queue = [selectedSample.id];
    while (queue.length) {
      const current = queue.shift()!;
      const next = data.processing.flatMap((event) => direction === "upstream"
        ? event.outputSampleIds.includes(current) ? event.inputSampleIds : []
        : event.inputSampleIds.includes(current) ? event.outputSampleIds : []);
      for (const id of next) if (!visited.has(id)) { visited.add(id); queue.push(id); }
    }
    return [...visited].filter((id) => id !== selectedSample.id);
  };
  const selectedSample = data.samples.find((sample) => sample.id === selected?.id);
  const upstream = traceSamples("upstream");
  const downstream = traceSamples("downstream");

  return <>
   <PageHeading eyebrow="Sample relationship view" title="Sample lineage explorer" subtitle="Explore relationships explicitly present in the dataset.">
   <Badge tone="success">Demo mode</Badge>
   </PageHeading>
    <div style={{ marginBottom: 14 }}>
    <Notice>Graph data is currently loaded from the local demo provider.</Notice>
    </div>
    {graphLoading ? <Panel title="Lineage graph"><EmptyState title="Loading lineage graph" detail="Mapping synthetic records and relationships." /></Panel> : graphError ? <Panel title="Lineage graph"><EmptyState title="Unable to load graph" detail={graphError} /></Panel> : graph.nodes.length === 0 ? <Panel title="Lineage graph"><EmptyState title="No graph records" detail="Add sample, processing, or experiment records to populate the graph." /></Panel> : nodes.length === 0 ? <Panel title="Lineage graph"><EmptyState title="No visible nodes" detail="Turn on at least one node type in Graph filters." /></Panel> : <div className="lineage-layout">
      <div className="flow-panel"><div className="flow-toolbar"><div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px", border: "1px solid #e2e9e9", borderRadius: 5, background: "white" }}><Search size={13} color="#83939a" /><input aria-label="Search sample ID" placeholder="Find sample ID" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") searchSample(); }} /></div><button className="button" onClick={searchSample}>Find</button></div><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onNodeClick={(_, node) => selectNode(node as GraphNode)} nodeTypes={graphNodeTypes} fitView fitViewOptions={{ padding: .2 }} minZoom={.15} maxZoom={1.8} nodesDraggable nodesConnectable={false} proOptions={{ hideAttribution: true }}><Background color="#e9eeee" gap={22} /><Controls /><MiniMap pannable zoomable nodeColor={(node) => nodeColors[(node.data as LineageNodeData).kind]} /></ReactFlow></div>
      <aside className="lineage-aside"><Panel title="Graph filters" caption="Toggle entity and relationship types"><div className="filter-list">{(Object.keys(nodeLabels) as Kind[]).map((kind) => <label key={kind} className="check-row"><input type="checkbox" checked={enabled[kind]} onChange={() => setEnabled((current) => ({ ...current, [kind]: !current[kind] }))} /><span style={{ width: 8, height: 8, borderRadius: 2, background: nodeColors[kind] }} />{nodeLabels[kind]}</label>)}<div className="detail-label" style={{ marginTop: 7 }}>Relationship label</div><select aria-label="Filter relationship type" className="field-select" value={relationshipFilter} onChange={(event) => setRelationshipFilter(event.target.value)}><option>All</option>{[...new Set(graph.edges.map((edge) => edge.data?.relationship).filter(Boolean))].map((relationship) => <option key={relationship}>{relationship}</option>)}</select></div></Panel>
        <Panel title={selected ? "Selected node" : "Node details"} caption={selected ? nodeLabels[selected.data.kind] : "Select a graph node"}>{selected ? <><div className="detail-value">{selected.data.label}</div><div className="detail-block"><div className="detail-label">Record</div><div className="detail-value">{selected.data.subtitle}</div></div>{selectedSample && <><div className="detail-block"><div className="detail-label">Donor record</div><div className="detail-value">{selectedSample.donorId}</div></div><div className="detail-block"><div className="detail-label">Storage</div><div className="detail-value">{selectedSample.storageUnitId}</div></div><div className="detail-block"><div className="detail-label">Upstream parent samples</div><div className="detail-value">{upstream.join(", ") || "None recorded"}</div></div><div className="detail-block"><div className="detail-label">Downstream derived samples</div><div className="detail-value">{downstream.join(", ") || "None recorded"}</div></div></>}<div className="detail-block"><div className="detail-label">Processing lineage trace</div><div className="detail-value">{upstream.length} upstream · {downstream.length} downstream</div></div><div className="panel-caption">Trace follows processing input/output records only. Experiment associations are not sample derivation.</div></> : <div className="panel-caption">Choose a node to inspect its record and relationship neighborhood.</div>}</Panel>
        <Panel title="Graph legend"><div className="filter-list">{(Object.keys(nodeLabels) as Kind[]).map((kind) => <div key={kind} className="check-row"><span style={{ width: 10, height: 10, borderRadius: 2, background: nodeColors[kind] }} />{nodeLabels[kind]}</div>)}</div></Panel>
      </aside>
    </div>}
  </>;
}