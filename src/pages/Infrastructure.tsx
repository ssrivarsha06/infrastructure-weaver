import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  MapPin,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Droplets,
  Radio,
  Car,
} from "lucide-react";

import { Layout } from "@/components/Layout";
import { NetworkGraph } from "@/components/NetworkGraph";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getTypeLabel, getNodeColor } from "@/data/infrastructure";
import { fetchInfrastructure } from "@/lib/api";
import { buildGraph } from "@/lib/graphMapper";

const typeIcons: any = {
  power: Zap,
  water: Droplets,
  telecom: Radio,
  transport: Car,
};

export default function Infrastructure() {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  // 🔗 Load data from backend (Neo4j)
const [cities, setCities] = useState<string[]>([]);
const [selectedCity, setSelectedCity] = useState<string | null>(null);

useEffect(() => {
  // Load cities
  fetch("http://localhost:4000/api/cities")
    .then(res => res.json())
    .then(setCities);
}, []);

useEffect(() => {
  if (!selectedCity) return;

  fetchInfrastructure(selectedCity).then((data) => {
    const graph = buildGraph(data);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setSelectedNode(null);
  });
}, [selectedCity]);

  // 🔍 Compute connections dynamically from edges
  const getConnections = (nodeId: string) => {
  // Nodes THIS node depends on
  const dependsOn = edges
    .filter(e => e.source === nodeId)   // A → B
    .map(e => nodes.find(n => n.id === e.target))
    .filter(Boolean);

  // Nodes that depend on THIS node
  const dependents = edges
    .filter(e => e.target === nodeId)   // A → B, B provides to A
    .map(e => nodes.find(n => n.id === e.source))
    .filter(Boolean);

  return { dependsOn, dependents };
};



  const connections = selectedNode ? getConnections(selectedNode.id) : null;
  const TypeIcon = selectedNode ? typeIcons[selectedNode.type] : null;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Infrastructure Network
          </h1>
          <p className="text-muted-foreground">
            Click on any node to view its details and dependencies
          </p>
        </div>
<div className="max-w-xs">
  <label className="text-sm font-medium">City</label>
  <select
    value={selectedCity || ""}
    onChange={(e) => setSelectedCity(e.target.value)}
    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
  >
    <option value="">Select city</option>
    {cities.map((city) => (
      <option key={city} value={city}>
        {city}
      </option>
    ))}
  </select>
</div>
        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {(["power", "water", "telecom", "transport"] as const).map((type) => (
            <div key={type} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getNodeColor(type) }}
              />
              <span className="text-sm text-muted-foreground">
                {getTypeLabel(type)}
              </span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Graph */}
          <div className="lg:col-span-2">
            <NetworkGraph
              nodes={nodes}
              edges={edges}
              onNodeClick={setSelectedNode}
              selectedNodeId={selectedNode?.id}
            />
          </div>

          {/* Details Panel */}
          <div className="lg:col-span-1">
            <AnimatePresence mode="wait">
              {selectedNode ? (
                <motion.div
                  key={selectedNode.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-lg"
                            style={{
                              backgroundColor: `${getNodeColor(
                                selectedNode.type
                              )}20`,
                            }}
                          >
                            {TypeIcon && (
                              <TypeIcon
                                className="h-5 w-5"
                                style={{
                                  color: getNodeColor(selectedNode.type),
                                }}
                              />
                            )}
                          </div>
                          <div>
                            <CardTitle className="text-lg">
                              {selectedNode.name}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {getTypeLabel(selectedNode.type)}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedNode(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <StatusBadge status={selectedNode.status} />

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedNode.location}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedNode.department}</span>
                        </div>
                      </div>

                      {/* Depends On */}
                      <div className="border-t border-border pt-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <ArrowDownLeft className="h-4 w-4" />
                          Depends On ({connections?.dependsOn.length})
                        </div>
                        {connections?.dependsOn.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No dependencies
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {connections?.dependsOn.map((unit: any) => (
                              <button
                                key={unit.id}
                                onClick={() => setSelectedNode(unit)}
                                className="flex w-full items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                              >
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: getNodeColor(unit.type),
                                  }}
                                />
                                {unit.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Provides To */}
                      <div className="border-t border-border pt-4">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                          <ArrowUpRight className="h-4 w-4" />
                          Provides To ({connections?.dependents.length})
                        </div>
                        {connections?.dependents.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No dependents
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {connections?.dependents.map((unit: any) => (
                              <button
                                key={unit.id}
                                onClick={() => setSelectedNode(unit)}
                                className="flex w-full items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-left hover:bg-accent transition-colors"
                              >
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    backgroundColor: getNodeColor(unit.type),
                                  }}
                                />
                                {unit.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="flex h-full min-h-[400px] items-center justify-center">
                    <CardContent className="text-center">
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                        <Zap className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">
                        Select a node to view details
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
