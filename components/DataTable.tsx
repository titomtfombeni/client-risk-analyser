
import React from 'react';
import type { GraphData } from '../types';
import { Card } from './ui/Card';

interface DataTableProps {
    graphData: GraphData;
}

export const DataTable: React.FC<DataTableProps> = ({ graphData }) => {
    return (
        <div className="p-4 space-y-6 h-full overflow-y-auto">
            <Card>
                <Card.Header>
                    <h3 className="text-lg font-semibold text-gray-800">Entities (Nodes)</h3>
                </Card.Header>
                <Card.Content>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jurisdiction</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Risk</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Final Score</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {graphData.nodes.map((node) => (
                                    <tr key={node.id}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{node.id}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{node.type}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{node.jurisdiction.toUpperCase()}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{node.base_risk}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-700">{node.final_risk_score}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card.Content>
            </Card>

            <Card>
                <Card.Header>
                    <h3 className="text-lg font-semibold text-gray-800">Relationships (Edges)</h3>
                </Card.Header>
                <Card.Content>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ownership %</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {graphData.edges.map((edge, index) => (
                                    <tr key={`${edge.source}-${edge.target}-${index}`}>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{edge.source}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{edge.target}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{edge.relationship}</td>
                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{edge.percentage ? `${edge.percentage}%` : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card.Content>
            </Card>
        </div>
    );
};