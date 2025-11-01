
import React from 'react';
import type { AnalyzedNodeData } from '../types';
import { TEST_CASES, RISK_LEVELS, getRiskCategory } from '../constants';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';

interface ControlPanelProps {
    selectedCase: string;
    onCaseChange: (caseName: string) => void;
    clientNode: AnalyzedNodeData | null;
    aiExplanation: string;
    isLoading: boolean;
    isExporting: boolean;
    onAnalyzeSelected: () => void;
    onAnalyzeRandom: () => void;
    onExportReport: () => void;
}

const AILoader: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
        <div className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
        <div className="h-2.5 w-2.5 bg-gray-400 rounded-full animate-pulse"></div>
        <span className="text-sm text-gray-500">Generating AI explanation...</span>
    </div>
);


export const ControlPanel: React.FC<ControlPanelProps> = ({ 
    selectedCase, 
    onCaseChange, 
    clientNode, 
    aiExplanation, 
    isLoading,
    isExporting,
    onAnalyzeSelected,
    onAnalyzeRandom,
    onExportReport
 }) => {
    
    const riskCategory = clientNode ? getRiskCategory(clientNode.final_risk_score) : 'Low';
    const riskClass = RISK_LEVELS[riskCategory]?.class || 'bg-gray-200';
    const canExport = !!clientNode;

    return (
        <div className="p-2 space-y-6">
            <div>
                <label htmlFor="test-case-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Select Test Scenario
                </label>
                <select
                    id="test-case-select"
                    value={selectedCase}
                    onChange={(e) => onCaseChange(e.target.value)}
                    disabled={isLoading || isExporting}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md shadow-sm disabled:opacity-50"
                >
                    {Object.entries(TEST_CASES).map(([key, value]) => (
                        <option key={key} value={key}>{value.title}</option>
                    ))}
                </select>
            </div>

            <div className="flex space-x-2">
                <button
                    onClick={onAnalyzeSelected}
                    disabled={isLoading || isExporting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-brand-primary rounded-md shadow-sm hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 transition-colors"
                    aria-label="Analyze the selected scenario from the dropdown"
                >
                    Analyze Selected
                </button>
                <button
                    onClick={onAnalyzeRandom}
                    disabled={isLoading || isExporting}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:opacity-50 transition-colors"
                    aria-label="Analyze a new, randomly generated scenario"
                >
                    Analyze Random
                </button>
            </div>
            
            <button
                onClick={onExportReport}
                disabled={isLoading || isExporting || !canExport}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Export the full analysis report as a PDF document"
            >
                {isExporting ? 'Exporting...' : 'Export Full Report (PDF)'}
            </button>

            {clientNode && (
                <Card>
                    <Card.Header>
                        <h3 className="text-lg font-semibold text-gray-800">Risk Analysis Summary</h3>
                        <p className="text-sm text-gray-500 truncate" title={clientNode.id}>{clientNode.id}</p>
                    </Card.Header>
                    <Card.Content>
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-semibold">Final Rating</span>
                            <Badge category={riskCategory}>{riskCategory}</Badge>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                             <span className="font-semibold">Risk Score</span>
                             <span className={`font-bold text-2xl ${riskClass.replace('bg-', 'text-')} rounded-full px-2`}>{clientNode.final_risk_score}</span>
                        </div>

                        <h4 className="font-semibold mt-6 mb-2 text-gray-700">Key Risk Factors</h4>
                        {clientNode.final_risk_reasons && clientNode.final_risk_reasons.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                                {clientNode.final_risk_reasons.map((reason, index) => (
                                    <li key={index}>{reason}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500">No significant risk factors identified.</p>
                        )}
                    </Card.Content>
                </Card>
            )}

            <Card>
                <Card.Header>
                     <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-brand-secondary" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0110 5a3 3 0 012.598 4.5H13a1 1 0 110 2h-1.402A3.001 3.001 0 017 10a1 1 0 112 0 1 1 0 001 1h.098a1 1 0 110 2H10a3 3 0 01-2.598-4.5H6a1 1 0 110-2h1.402A3.001 3.001 0 0110 7z" clipRule="evenodd" /></svg>
                        AI-Powered Explanation
                    </h3>
                </Card.Header>
                <Card.Content>
                    {aiExplanation ? (
                         <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiExplanation}</p>
                    ) : isLoading ? (
                        <AILoader />
                    ) : (
                        <p className="text-sm text-gray-500">No explanation available.</p>
                    )}
                </Card.Content>
            </Card>

             <Card>
                <Card.Header>
                     <h3 className="text-lg font-semibold text-gray-800">Risk Calculation Methodology</h3>
                </Card.Header>
                <Card.Content>
                    <p className="text-sm text-gray-700 leading-relaxed">
                        The final risk score is determined by the highest value among the following factors:
                    </p>
                    <ul className="list-disc list-inside space-y-2 mt-2 text-sm text-gray-600">
                        <li>
                            <strong>Base Risk:</strong> Assessed for each entity individually.
                            <ul className="list-disc list-inside ml-4 mt-1">
                                <li>Sanctions Match: <strong>100</strong></li>
                                <li>PEP Match: <strong>75</strong></li>
                                <li>High-Risk Jurisdiction: <strong>50</strong></li>
                            </ul>
                        </li>
                        <li>
                            <strong>Propagated Risk:</strong> The client inherits the highest base risk from any entity in its ownership or control structure.
                        </li>
                         <li>
                            <strong>Structural Risk:</strong> Complex structures like circular ownership can introduce an override score (e.g., <strong>90</strong>) if it's higher than other factors.
                        </li>
                    </ul>
                </Card.Content>
            </Card>

        </div>
    );
};