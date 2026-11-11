
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeProps,
  Handle,
  Position,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Search } from "lucide-react";
import {
  Badge,
  EmptyState,
  PageHeading,
  Panel,
} from "@/components/ui";
import {
  type LineageEdge,
  type LineageGraph,
  type LineageKind,
  type LineageNode,
  type LineageNodeData,
} from "@/lib/lineage-adapter";

type Kind = LineageKind;
type GraphNode = LineageNode;

interface GraphSample {
  sample_id: string;
  sample_type_name: string;
  status: string;
  collection_date: string;
  description: string | null;
}

interface GraphDonor {
  donor_id: string;
  full_name: string;
  samples: GraphSample[];
}

interface GraphLineage {
  parent_sample_id: string;
  child_sample_id: string;
  relationship_type: string;
}

interface GraphApiResponse {
  success: boolean;
  message?: string;
  donors?: GraphDonor[];
  lineage?: GraphLineage[];
}

interface MongoLineageEvent {
  _id: string;
  sampleId: number;
  eventType: string;
  description: string;
  performedBy?: string;
  eventDate: string;
  createdAt: string;
}

interface EventsApiResponse {
  success: boolean;
  message?: string;
  count?: number;
  events?: MongoLineageEvent[];
}

const nodeColors: Record<Kind, string> = {
  donor: "#617d90",
  sample: "#168b82",
  process: "#c18b35",
  experiment: "#6d79a2",
  result: "#b46d69",
};

const nodeLabels: Record<Kind, string> = {
  donor: "Donor",
  sample: "Sample",
  process: "Processing",
  experiment: "Experiment",
  result: "Sequencing",
};

function GraphCard({ data, selected }: NodeProps<GraphNode>) {
  const color = nodeColors[data.kind];

  return (
    <div
      style={{
        minWidth: 150,
        maxWidth: 180,
        padding: "10px 12px",
        borderTop: `1px solid ${selected ? color : "#dce6e6"}`,
        borderRight: `1px solid ${selected ? color : "#dce6e6"}`,
        borderBottom: `1px solid ${selected ? color : "#dce6e6"}`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 5,
        background: "white",
        boxShadow: selected
          ? `0 0 0 2px ${color}28`
          : "0 2px 7px #132c3812",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: color }}
      />

      <div
        style={{
          color,
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: "uppercase",
        }}
      >
        {nodeLabels[data.kind]}
      </div>

      <div
        style={{
          marginTop: 4,
          color: "#183342",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        {data.label}
      </div>

      <div
        style={{
          marginTop: 3,
          color: "#73858d",
          fontSize: 9,
        }}
      >
        {data.subtitle}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        style={{ background: color }}
      />
    </div>
  );
}

const graphNodeTypes = { graph: GraphCard };

export function LineageExplorer() {
  const [graph, setGraph] = useState<LineageGraph>({
    nodes: [],
    edges: [],
  });

  const [databaseDonors, setDatabaseDonors] = useState<GraphDonor[]>([]);
  const [databaseLineage, setDatabaseLineage] = useState<GraphLineage[]>([]);

  const [events, setEvents] = useState<MongoLineageEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");

  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState("");

  const [nodes, setNodes, onNodesChange] =
    useNodesState<GraphNode>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<LineageEdge>([]);

  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [query, setQuery] = useState("");

  const [enabled, setEnabled] = useState<Record<Kind, boolean>>({
    donor: true,
    sample: true,
    process: true,
    experiment: true,
    result: true,
  });

  const [relationshipFilter, setRelationshipFilter] = useState("All");

  // Load donor, sample and lineage records from PostgreSQL.
  useEffect(() => {
    let active = true;

    async function loadGraph() {
      try {
        setGraphLoading(true);
        setGraphError("");

        const response = await fetch("/api/lineage-graph");
        const result: GraphApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load lineage data."
          );
        }

        const donors = result.donors ?? [];
        const lineage = result.lineage ?? [];

        const graphNodes: LineageNode[] = [];
        const graphEdges: LineageEdge[] = [];

        donors.forEach((donor, donorIndex) => {
          const donorNodeId = `donor-${donor.donor_id}`;

          graphNodes.push({
            id: donorNodeId,
            type: "graph",
            position: {
              x: 20,
              y: 90 + donorIndex * 260,
            },
            data: {
              kind: "donor",
              label: donor.full_name,
              subtitle: `Donor ${donor.donor_id}`,
              recordId: donor.donor_id,
            },
          });

          donor.samples.forEach((sample, sampleIndex) => {
            const sampleNodeId = `sample-${sample.sample_id}`;

            graphNodes.push({
              id: sampleNodeId,
              type: "graph",
              position: {
                x: 300,
                y: 90 + donorIndex * 260 + sampleIndex * 110,
              },
              data: {
                kind: "sample",
                label: `Sample ${sample.sample_id}`,
                subtitle: `${sample.sample_type_name} · ${sample.status}`,
                recordId: sample.sample_id,
              },
            });

            graphEdges.push({
              id: `${donorNodeId}-${sampleNodeId}`,
              source: donorNodeId,
              target: sampleNodeId,
              label: "collected as",
              type: "smoothstep",
              markerEnd: {
                type: "arrowclosed",
                color: "#82969b",
              },
              style: {
                stroke: "#82969b",
                strokeWidth: 1.5,
              },
              data: {
                relationship: "collected as",
              },
            });
          });
        });

        // Add actual sample-to-sample lineage relationships.
        lineage.forEach((relationship) => {
          const source = `sample-${relationship.parent_sample_id}`;
          const target = `sample-${relationship.child_sample_id}`;

          graphEdges.push({
            id: `lineage-${source}-${target}`,
            source,
            target,
            label: relationship.relationship_type,
            type: "smoothstep",
            markerEnd: {
              type: "arrowclosed",
              color: "#168b82",
            },
            style: {
              stroke: "#168b82",
              strokeWidth: 2,
            },
            data: {
              relationship: relationship.relationship_type,
            },
          });
        });

        if (active) {
          setDatabaseDonors(donors);
          setDatabaseLineage(lineage);
          setGraph({
            nodes: graphNodes,
            edges: graphEdges,
          });
        }
      } catch (error) {
        if (active) {
          setGraphError(
            error instanceof Error
              ? error.message
              : "Unable to load lineage data."
          );
        }
      } finally {
        if (active) {
          setGraphLoading(false);
        }
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, []);

  // Load real event history from MongoDB.
  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        setEventsLoading(true);
        setEventsError("");

        const response = await fetch("/api/lineage-events");
        const result: EventsApiResponse = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load MongoDB event history."
          );
        }

        if (active) {
          setEvents(result.events ?? []);
        }
      } catch (error) {
        if (active) {
          setEventsError(
            error instanceof Error
              ? error.message
              : "Unable to load MongoDB event history."
          );
        }
      } finally {
        if (active) {
          setEventsLoading(false);
        }
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  // Apply graph filters.
  useEffect(() => {
    const visible = graph.nodes.filter(
      (node) => enabled[node.data.kind]
    );

    const visibleIds = new Set(
      visible.map((node) => node.id)
    );

    setNodes(visible);

    setEdges(
      graph.edges.filter(
        (edge) =>
          visibleIds.has(edge.source) &&
          visibleIds.has(edge.target) &&
          (relationshipFilter === "All" ||
            edge.data?.relationship === relationshipFilter)
      )
    );
  }, [
    enabled,
    graph,
    relationshipFilter,
    setEdges,
    setNodes,
  ]);

  const selectNode = useCallback(
    (node: GraphNode) => setSelected(node),
    []
  );

  // Search by sample ID.
  const searchSample = () => {
    const searchValue = query.trim().toLowerCase();

    const found = nodes.find(
      (node) =>
        node.data.kind === "sample" &&
        (
          node.data.recordId.toLowerCase() === searchValue ||
          node.data.label.toLowerCase() === searchValue ||
          `sample ${node.data.recordId}`.toLowerCase() === searchValue
        )
    );

    setSelected(found ?? null);
  };

  // Find the selected sample in the PostgreSQL response.
  const selectedSample =
    selected?.data.kind === "sample"
      ? databaseDonors
          .flatMap((donor) => donor.samples)
          .find(
            (sample) =>
              sample.sample_id === selected.data.recordId
          )
      : undefined;

  const selectedDonor =
    selected?.data.kind === "donor"
      ? databaseDonors.find(
          (donor) =>
            donor.donor_id === selected.data.recordId
        )
      : undefined;

  const selectedSampleLineage =
    selected?.data.kind === "sample"
      ? databaseLineage.filter(
          (item) =>
            item.parent_sample_id === selected.data.recordId ||
            item.child_sample_id === selected.data.recordId
        )
      : [];

  // Match MongoDB events to the selected sample.
  const selectedSampleEvents =
    selectedSample
      ? events
          .filter(
            (event) =>
              String(event.sampleId) === selectedSample.sample_id
          )
          .sort(
            (a, b) =>
              new Date(b.eventDate).getTime() -
              new Date(a.eventDate).getTime()
          )
      : [];

  return (
    <>
      <PageHeading
        eyebrow="Sample relationship view"
        title="Sample lineage explorer"
        subtitle="Explore donor, sample and event relationships across PostgreSQL and MongoDB."
      >
        <Badge tone="success">PostgreSQL + MongoDB</Badge>
      </PageHeading>

      {graphLoading ? (
        <Panel title="Lineage graph">
          <EmptyState
            title="Loading lineage graph"
            detail="Retrieving donor, sample and lineage records from PostgreSQL."
          />
        </Panel>
      ) : graphError ? (
        <Panel title="Lineage graph">
          <EmptyState
            title="Unable to load graph"
            detail={graphError}
          />
        </Panel>
      ) : graph.nodes.length === 0 ? (
        <Panel title="Lineage graph">
          <EmptyState
            title="No graph records"
            detail="No donor or sample records were found in PostgreSQL."
          />
        </Panel>
      ) : nodes.length === 0 ? (
        <Panel title="Lineage graph">
          <EmptyState
            title="No visible nodes"
            detail="Turn on at least one node type in Graph filters."
          />
        </Panel>
      ) : (
        <div className="lineage-layout">
          <div className="flow-panel">
            <div className="flow-toolbar">
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 8px",
                  border: "1px solid #e2e9e9",
                  borderRadius: 5,
                  background: "white",
                }}
              >
                <Search size={13} color="#83939a" />

                <input
                  aria-label="Search sample ID"
                  placeholder="Find sample ID"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") searchSample();
                  }}
                />
              </div>

              <button className="button" onClick={searchSample}>
                Find
              </button>
            </div>

            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={(_, node) =>
                selectNode(node as GraphNode)
              }
              nodeTypes={graphNodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.15}
              maxZoom={1.8}
              nodesDraggable
              nodesConnectable={false}
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#e9eeee" gap={22} />
              <Controls />
              <MiniMap
                pannable
                zoomable
                nodeColor={(node) =>
                  nodeColors[
                    (node.data as LineageNodeData).kind
                  ]
                }
              />
            </ReactFlow>
          </div>

          <aside className="lineage-aside">
            <Panel
              title="Graph filters"
              caption="Toggle entity and relationship types"
            >
              <div className="filter-list">
                {(Object.keys(nodeLabels) as Kind[]).map(
                  (kind) => (
                    <label key={kind} className="check-row">
                      <input
                        type="checkbox"
                        checked={enabled[kind]}
                        onChange={() =>
                          setEnabled((current) => ({
                            ...current,
                            [kind]: !current[kind],
                          }))
                        }
                      />

                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 2,
                          background: nodeColors[kind],
                        }}
                      />

                      {nodeLabels[kind]}
                    </label>
                  )
                )}

                <div
                  className="detail-label"
                  style={{ marginTop: 7 }}
                >
                  Relationship label
                </div>

                <select
                  aria-label="Filter relationship type"
                  className="field-select"
                  value={relationshipFilter}
                  onChange={(event) =>
                    setRelationshipFilter(event.target.value)
                  }
                >
                  <option>All</option>
                  {[
                    ...new Set(
                      graph.edges
                        .map((edge) => edge.data?.relationship)
                        .filter(
                          (relationship): relationship is string =>
                            typeof relationship === "string"
                        )
                    ),
                  ].map((relationship) => (
                    <option key={relationship} value={relationship}>
                      {relationship}
                    </option>
                  ))}
                </select>
              </div>
            </Panel>

            <Panel
              title={selected ? "Selected node" : "Node details"}
              caption={
                selected
                  ? nodeLabels[selected.data.kind]
                  : "Select a graph node"
              }
            >
              {selected ? (
                <>
                  <div className="detail-value">
                    {selected.data.label}
                  </div>

                  <div className="detail-block">
                    <div className="detail-label">Record</div>
                    <div className="detail-value">
                      {selected.data.subtitle}
                    </div>
                  </div>

                  {selectedDonor && (
                    <>
                      <div className="detail-block">
                        <div className="detail-label">Donor ID</div>
                        <div className="detail-value">
                          {selectedDonor.donor_id}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">Associated samples</div>
                        <div className="detail-value">
                          {selectedDonor.samples.length}
                        </div>
                      </div>
                    </>
                  )}

                  {selectedSample && (
                    <>
                      <div className="detail-block">
                        <div className="detail-label">Sample ID</div>
                        <div className="detail-value">
                          {selectedSample.sample_id}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">Sample type</div>
                        <div className="detail-value">
                          {selectedSample.sample_type_name}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">Status</div>
                        <div className="detail-value">
                          {selectedSample.status}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">Collection date</div>
                        <div className="detail-value">
                          {new Date(
                            selectedSample.collection_date
                          ).toISOString().slice(0, 10)}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">Description</div>
                        <div className="detail-value">
                          {selectedSample.description || "Not provided"}
                        </div>
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">
                          Sample lineage relationships
                        </div>

                        {selectedSampleLineage.length > 0 ? (
                          selectedSampleLineage.map((item) => (
                            <div
                              key={`${item.parent_sample_id}-${item.child_sample_id}`}
                              className="detail-value"
                              style={{ marginTop: 5 }}
                            >
                              Sample {item.parent_sample_id}
                              {" → "}
                              Sample {item.child_sample_id}
                              {" · "}
                              {item.relationship_type}
                            </div>
                          ))
                        ) : (
                          <div className="detail-value">
                            No sample lineage relationships recorded.
                          </div>
                        )}
                      </div>

                      <div className="detail-block">
                        <div className="detail-label">
                          MongoDB event history
                        </div>

                        {eventsLoading ? (
                          <div className="detail-value">
                            Loading event history...
                          </div>
                        ) : eventsError ? (
                          <div className="detail-value">
                            {eventsError}
                          </div>
                        ) : selectedSampleEvents.length > 0 ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 12,
                              marginTop: 10,
                            }}
                          >
                            {selectedSampleEvents.map((event) => (
                              <div
                                key={event._id}
                                style={{
                                  padding: 10,
                                  border: "1px solid #e2e9e9",
                                  borderRadius: 6,
                                  background: "#fbfdfd",
                                }}
                              >
                                <div
                                  style={{
                                    color: "#168b82",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {event.eventType}
                                </div>

                                <div
                                  style={{
                                    marginTop: 5,
                                    color: "#183342",
                                    fontSize: 12,
                                  }}
                                >
                                  {event.description}
                                </div>

                                <div
                                  style={{
                                    marginTop: 7,
                                    color: "#73858d",
                                    fontSize: 10,
                                  }}
                                >
                                  Date:{" "}
                                  {new Date(event.eventDate)
                                    .toISOString()
                                    .slice(0, 16)
                                    .replace("T", " ")}
                                </div>

                                <div
                                  style={{
                                    marginTop: 3,
                                    color: "#73858d",
                                    fontSize: 10,
                                  }}
                                >
                                  Researcher: {event.performedBy || "Not specified"}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="detail-value">
                            No MongoDB events recorded for this sample.
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="panel-caption">
                    Donor and sample lineage relationships are retrieved
                    from PostgreSQL. Sample event history is retrieved
                    from MongoDB.
                  </div>
                </>
              ) : (
                <div className="panel-caption">
                  Choose a donor or sample node to inspect its database
                  record and event history.
                </div>
              )}
            </Panel>

            <Panel title="Graph legend">
              <div className="filter-list">
                {(Object.keys(nodeLabels) as Kind[]).map(
                  (kind) => (
                    <div key={kind} className="check-row">
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 2,
                          background: nodeColors[kind],
                        }}
                      />
                      {nodeLabels[kind]}
                    </div>
                  )
                )}
              </div>
            </Panel>
          </aside>
        </div>
      )}
    </>
  );
}
