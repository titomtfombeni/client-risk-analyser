
export type RiskCategory = "Prohibited" | "High" | "Medium" | "Low";
export type NodeType = 'Corporate' | 'Trust' | 'Person';
export type RelationshipType = 'OWNS' | 'DIRECTOR';

export interface BaseNodeData {
    id: string;
    type: NodeType;
    jurisdiction: string;
    depth: number;
}

export interface AnalyzedNodeData extends BaseNodeData {
    base_risk: number;
    base_risk_reasons: string[];
    structural_risk?: string;
    final_risk_score: number;
    final_risk_reasons?: string[];
    risk_category: RiskCategory;
}

export interface EdgeData {
    source: string;
    target: string;
    relationship: RelationshipType;
    percentage?: number;
}

export interface GraphData {
    nodes: AnalyzedNodeData[];
    edges: EdgeData[];
}

export interface RawGraphData {
    nodes: BaseNodeData[];
    edges: EdgeData[];
    sanctions_list: Set<string>;
    pep_list: Set<string>;
}

export interface TestCase {
    client_id: string;
    avg_nodes: number;
    max_depth: number;
    risk_prob: number;
    circular_prob: number;
    title: string;
}
