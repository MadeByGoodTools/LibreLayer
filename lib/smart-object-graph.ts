export type SmartObjectGraphNode = {
  instanceId?: string;
  dependencies?: string[];
};

export function assertAcyclicSmartObjectGraph(nodes: SmartObjectGraphNode[]) {
  const graph = new Map<string, Set<string>>();
  for (const node of nodes) {
    if (!node.instanceId) continue;
    if (typeof node.instanceId !== 'string') throw Error('Invalid Smart Object instance');
    const edges = graph.get(node.instanceId) ?? new Set<string>();
    for (const dependency of node.dependencies ?? []) {
      if (typeof dependency !== 'string' || !dependency)
        throw Error('Invalid Smart Object dependency');
      edges.add(dependency);
    }
    graph.set(node.instanceId, edges);
  }
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw Error('Cyclic Smart Object dependency');
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dependency of graph.get(id) ?? []) visit(dependency);
    visiting.delete(id);
    visited.add(id);
  };
  for (const id of graph.keys()) visit(id);
}
