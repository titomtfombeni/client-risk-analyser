
import type { TestCase, RawGraphData, NodeType, BaseNodeData } from '../types';
import { ALL_JURISDICTIONS, HIGH_RISK_JURISDICTIONS } from '../constants';

const firstNames = ['John', 'Jane', 'Peter', 'Mary', 'David', 'Susan', 'Michael', 'Linda'];
const lastNames = ['Smith', 'Jones', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore'];
const companyNouns = ['Apex', 'Vertex', 'Zenith', 'Nadir', 'Omega', 'Alpha', 'Quantum', 'Stellar'];
const companyAdjectives = ['Global', 'Dynamic', 'Innovative', 'Strategic', 'Advanced', 'Prime', 'NextGen'];
const companySuffixes = ['Ltd.', 'Inc.', 'GmbH', 'S.A.', 'Holdings', 'Ventures'];

// Simple pseudo-random name generators to replace Faker
const fakeName = (): string => `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
const fakeTrustName = (): string => `The ${lastNames[Math.floor(Math.random() * lastNames.length)]} Family Trust`;
const fakeCompanyName = (): string => `${companyAdjectives[Math.floor(Math.random() * companyAdjectives.length)]} ${companyNouns[Math.floor(Math.random() * companyNouns.length)]} ${companySuffixes[Math.floor(Math.random() * companySuffixes.length)]}`;

const createSyntheticNode = (nodeDepth: number, maxDepth: number): BaseNodeData => {
    let entityType: NodeType;
    if (nodeDepth === maxDepth) {
        entityType = Math.random() < 0.5 ? 'Person' : 'Trust';
    } else {
        const rand = Math.random();
        if (rand < 0.8) entityType = 'Corporate';
        else if (rand < 0.95) entityType = 'Trust';
        else entityType = 'Person';
    }

    const jurisdiction = ALL_JURISDICTIONS[Math.floor(Math.random() * ALL_JURISDICTIONS.length)];
    
    let nodeId: string;
    if (entityType === 'Person') nodeId = fakeName();
    else if (entityType === 'Trust') nodeId = fakeTrustName();
    else nodeId = fakeCompanyName();

    return { id: nodeId, type: entityType, jurisdiction, depth: nodeDepth };
};

export const generateNetwork = (testCase: TestCase): RawGraphData => {
    const { client_id, avg_nodes, max_depth, risk_prob, circular_prob } = testCase;

    const sanctionsList = new Set<string>();
    const pepList = new Set<string>();
    const graph: RawGraphData = {
        nodes: [],
        edges: [],
        sanctions_list: sanctionsList,
        pep_list: pepList
    };
    const nodeMap = new Map<string, BaseNodeData>();

    const clientAttrs: BaseNodeData = {
        id: client_id,
        type: 'Corporate',
        jurisdiction: ALL_JURISDICTIONS.find(j => !HIGH_RISK_JURISDICTIONS.has(j)) || 'uk',
        depth: 0
    };
    graph.nodes.push(clientAttrs);
    nodeMap.set(client_id, clientAttrs);

    let frontier = [client_id];
    let nodesToCreate = avg_nodes - 1;

    while (nodesToCreate > 0 && frontier.length > 0) {
        const owneeId = frontier.splice(Math.floor(Math.random() * frontier.length), 1)[0];
        const owneeNode = nodeMap.get(owneeId);
        if (!owneeNode || owneeNode.depth >= max_depth) continue;

        const numOwners = Math.floor(Math.random() * 2) + 1;

        for (let i = 0; i < numOwners && nodesToCreate > 0; i++) {
            let newOwnerNode: BaseNodeData;
            do {
                newOwnerNode = createSyntheticNode(owneeNode.depth + 1, max_depth);
            } while (nodeMap.has(newOwnerNode.id)); // Ensure unique IDs

            nodeMap.set(newOwnerNode.id, newOwnerNode);
            graph.nodes.push(newOwnerNode);
            graph.edges.push({
                source: newOwnerNode.id,
                target: owneeId,
                relationship: 'OWNS',
                percentage: Math.floor(Math.random() * 91) + 10
            });
            nodesToCreate--;

            if (newOwnerNode.type !== 'Person') {
                frontier.push(newOwnerNode.id);
            }

            if (Math.random() < risk_prob) {
                if (Math.random() < 0.3) sanctionsList.add(newOwnerNode.id);
                else pepList.add(newOwnerNode.id);
            }
        }
    }

    if (Math.random() < circular_prob) {
        const corporateNodes = graph.nodes.filter(n => n.type !== 'Person' && n.id !== client_id);
        if (corporateNodes.length > 2) {
            const nodeA = corporateNodes[Math.floor(Math.random() * corporateNodes.length)];
            
            // Simplified cycle creation: find any other corporate node and link back
            const potentialTargets = corporateNodes.filter(n => n.id !== nodeA.id);
            if (potentialTargets.length > 0) {
                const nodeB = potentialTargets[Math.floor(Math.random() * potentialTargets.length)];
                graph.edges.push({
                    source: nodeA.id,
                    target: nodeB.id,
                    relationship: 'OWNS',
                    percentage: Math.floor(Math.random() * 16) + 5
                });
            }
        }
    }

    const numDirectors = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numDirectors; i++) {
        let directorNode: BaseNodeData;
        do {
            directorNode = createSyntheticNode(1, max_depth);
            directorNode.type = 'Person'; // Directors are people
        } while (nodeMap.has(directorNode.id));

        nodeMap.set(directorNode.id, directorNode);
        graph.nodes.push(directorNode);
        graph.edges.push({
            source: directorNode.id,
            target: client_id,
            relationship: 'DIRECTOR'
        });
        if (Math.random() < risk_prob) {
            pepList.add(directorNode.id);
        }
    }
    
    return graph;
};
