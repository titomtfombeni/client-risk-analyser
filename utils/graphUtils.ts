
import type { BaseNodeData, EdgeData } from '../types';

export const findAncestors = (startNodeId: string, nodes: BaseNodeData[], edges: EdgeData[]): Set<string> => {
    const ancestors = new Set<string>();
    const toVisit = [startNodeId];
    const visited = new Set<string>();

    while (toVisit.length > 0) {
        const currentNodeId = toVisit.pop()!;
        if (visited.has(currentNodeId)) {
            continue;
        }
        visited.add(currentNodeId);

        const parents = edges.filter(e => e.target === currentNodeId).map(e => e.source);
        for (const parentId of parents) {
            if (!ancestors.has(parentId)) {
                ancestors.add(parentId);
                toVisit.push(parentId);
            }
        }
    }
    return ancestors;
};

export const detectCycles = (nodes: BaseNodeData[], edges: EdgeData[]): string[][] => {
    const adj = new Map<string, string[]>();
    nodes.forEach(node => adj.set(node.id, []));
    edges.forEach(edge => {
        if (!adj.has(edge.source)) adj.set(edge.source, []);
        adj.get(edge.source)!.push(edge.target);
    });

    const visiting = new Set<string>();
    const visited = new Set<string>();
    const cycles: string[][] = [];

    const dfs = (nodeId: string, path: string[]) => {
        visiting.add(nodeId);
        path.push(nodeId);

        const neighbors = adj.get(nodeId) || [];
        for (const neighborId of neighbors) {
            if (visiting.has(neighborId)) {
                const cycleStartIndex = path.indexOf(neighborId);
                const cycle = path.slice(cycleStartIndex);
                cycles.push(cycle);
            } else if (!visited.has(neighborId)) {
                dfs(neighborId, path);
            }
        }

        visiting.delete(nodeId);
        visited.add(nodeId);
        path.pop();
    };

    for (const node of nodes) {
        if (!visited.has(node.id)) {
            dfs(node.id, []);
        }
    }

    return cycles;
};
