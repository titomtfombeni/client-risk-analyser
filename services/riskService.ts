
import type { RawGraphData, GraphData, AnalyzedNodeData, BaseNodeData, EdgeData } from '../types';
import { HIGH_RISK_JURISDICTIONS, getRiskCategory } from '../constants';
import { findAncestors, detectCycles } from '../utils/graphUtils';

const ingestAndPropagateRisk = (graph: RawGraphData): AnalyzedNodeData[] => {
    const analyzedNodes: AnalyzedNodeData[] = graph.nodes.map((node: BaseNodeData): AnalyzedNodeData => {
        let base_risk = 0;
        const base_risk_reasons: string[] = [];

        if (graph.sanctions_list.has(node.id)) {
            base_risk = 100;
            base_risk_reasons.push("Sanctions Match");
        } else if (graph.pep_list.has(node.id)) {
            base_risk = 75;
            base_risk_reasons.push("PEP Match");
        }

        if (HIGH_RISK_JURISDICTIONS.has(node.jurisdiction)) {
            base_risk = Math.max(base_risk, 50);
            base_risk_reasons.push(`Jurisdiction: ${node.jurisdiction.toUpperCase()}`);
        }
        
        return {
            ...node,
            base_risk,
            base_risk_reasons,
            final_risk_score: 0, // will be calculated later
            risk_category: 'Low', // default
        };
    });

    const ownershipEdges = graph.edges.filter(e => e.relationship === 'OWNS');
    const cycles = detectCycles(graph.nodes, ownershipEdges);
    
    const nodeMap = new Map(analyzedNodes.map(n => [n.id, n]));
    
    for (const cycle of cycles) {
        for (const nodeId of cycle) {
            const node = nodeMap.get(nodeId);
            if (node) {
                node.structural_risk = "Circular Ownership";
            }
        }
    }
    
    return Array.from(nodeMap.values());
};

const aggregateRisk = (nodes: AnalyzedNodeData[], edges: EdgeData[], clientId: string): AnalyzedNodeData[] => {
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    
    // Set base risk for all nodes first
    for(const node of nodes) {
        node.final_risk_score = node.base_risk;
    }

    const clientNode = nodeMap.get(clientId);
    if (!clientNode) {
        console.error("Client node not found!");
        return nodes;
    }

    let propagated_risk_score = 0;
    let propagated_risk_reasons: string[] = [];
    
    const ancestors = findAncestors(clientId, nodes, edges);
    const directLinks = edges
        .filter(e => e.target === clientId && e.relationship === 'DIRECTOR')
        .map(e => e.source);

    const riskSources = [...new Set([...ancestors, ...directLinks])];

    for (const sourceId of riskSources) {
        const sourceNode = nodeMap.get(sourceId);
        if (sourceNode && sourceNode.base_risk > propagated_risk_score) {
            propagated_risk_score = sourceNode.base_risk;
            propagated_risk_reasons = [
                ...sourceNode.base_risk_reasons,
                `Risk propagated from ${sourceNode.id.split(' ')[0]} ${sourceNode.id.split(' ')[1]}`
            ];
        }
    }

    let final_risk_score = Math.max(clientNode.base_risk, propagated_risk_score);
    let final_reasons = [...clientNode.base_risk_reasons, ...propagated_risk_reasons];

    if (clientNode.structural_risk === "Circular Ownership") {
        final_risk_score = Math.max(final_risk_score, 90);
        final_reasons.push("Structural Override: Client is part of a circular ownership structure.");
    }
    
    clientNode.final_risk_score = final_risk_score;
    clientNode.final_risk_reasons = [...new Set(final_reasons)];

    // Final pass to assign risk category to all nodes
    for (const node of nodes) {
      // Propagate risk score visually up the chain for coloring
      const nodeAncestors = findAncestors(node.id, nodes, edges);
      let maxAncestorRisk = 0;
      for (const ancestorId of nodeAncestors) {
          const ancestorNode = nodeMap.get(ancestorId);
          if(ancestorNode) {
            maxAncestorRisk = Math.max(maxAncestorRisk, ancestorNode.base_risk);
          }
      }
      node.final_risk_score = Math.max(node.base_risk, maxAncestorRisk, node.id === clientId ? final_risk_score : 0);
      
      if(node.id === clientId) {
         node.final_risk_score = final_risk_score;
      }
      
      node.risk_category = getRiskCategory(node.final_risk_score);
    }
    
    return Array.from(nodeMap.values());
};

export const analyzeClientRisk = (graph: RawGraphData, clientId: string): GraphData => {
    const nodesWithBaseRisk = ingestAndPropagateRisk(graph);
    const finalAnalyzedNodes = aggregateRisk(nodesWithBaseRisk, graph.edges, clientId);

    return {
        nodes: finalAnalyzedNodes,
        edges: graph.edges,
    };
};
