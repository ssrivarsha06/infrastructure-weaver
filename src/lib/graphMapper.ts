export function buildGraph(apiData: any[]) {
  const nodeMap = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];

  apiData.forEach(item => {
    const from = item.from;
    const to = item.to;

    // Skip if from is invalid
    if (!from || !from.id) return;

    // Add FROM node
    if (!nodeMap.has(from.id)) {
      nodeMap.set(from.id, {
        id: from.id,
        name: from.name || "Unknown",
        type: from.type || "unknown",
        location: from.location || "Unknown",
        department: from.department || "Unknown",
        status: from.status || "operational",
      });
    }

    // Add TO node + Edge only if valid
    if (to && to.id) {
      if (!nodeMap.has(to.id)) {
        nodeMap.set(to.id, {
          id: to.id,
          name: to.name || "Unknown",
          type: to.type || "unknown",
          location: to.location || "Unknown",
          department: to.department || "Unknown",
          status: to.status || "operational",
        });
      }

      edges.push({
        source: from.id,
        target: to.id,
        label: item.relationship || "DEPENDS_ON",
      });
    }
  });

  console.log("Built nodes:", Array.from(nodeMap.values()));
  console.log("Built edges:", edges);

  return {
    nodes: Array.from(nodeMap.values()),
    edges,
  };
}