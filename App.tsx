
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { GraphVisualization } from './components/GraphVisualization';
import { DataTable } from './components/DataTable';
import { OrgChartVisualization } from './components/OrgChartVisualization';
import { generateNetwork, generateRandomTestCase } from './services/networkService';
import { analyzeClientRisk } from './services/riskService';
import { getRiskExplanation } from './services/geminiService';
import { generatePdfReport } from './services/reportService';
import type { GraphData, TestCase, AnalyzedNodeData } from './types';
import { TEST_CASES } from './constants';

const App: React.FC = () => {
    const [selectedCase, setSelectedCase] = useState<string>('alpha');
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [clientNode, setClientNode] = useState<AnalyzedNodeData | null>(null);
    const [aiExplanation, setAiExplanation] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'graph' | 'table' | 'orgchart'>('graph');
    const visualizationContainerRef = useRef<HTMLDivElement>(null);

    const runAnalysis = useCallback(async (testCase: TestCase) => {
        setIsLoading(true);
        setError(null);
        setAiExplanation('');
        // This brief timeout allows the UI to update to the loading state before the heavy processing begins.
        await new Promise(resolve => setTimeout(resolve, 50)); 
        try {
            const rawGraph = generateNetwork(testCase);
            const analyzedGraph = analyzeClientRisk(rawGraph, testCase.client_id);
            setGraphData(analyzedGraph);
            
            const client = analyzedGraph.nodes.find(n => n.id === testCase.client_id) as AnalyzedNodeData | undefined;
            if (client) {
                setClientNode(client);
                if (client.final_risk_score > 0) {
                     try {
                        const explanation = await getRiskExplanation(client, analyzedGraph);
                        setAiExplanation(explanation);
                    } catch (geminiError) {
                        console.error("Gemini API error:", geminiError);
                        setAiExplanation("Could not generate AI explanation. The API may be unavailable or the content was blocked.");
                    }
                } else {
                    setAiExplanation("The client has a low risk score, so no detailed AI explanation is necessary. All associated entities are in good standing.");
                }
            } else {
                 setClientNode(null);
                 setGraphData(null);
                 setError(`Client ID "${testCase.client_id}" not found in the generated graph.`);
            }
        } catch (e) {
            console.error("Failed to run analysis:", e);
            setError("An error occurred while generating or analyzing the network.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const currentCase = TEST_CASES[selectedCase];
        if (currentCase) {
            runAnalysis(currentCase);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAnalyzeSelected = useCallback(() => {
        const currentCase = TEST_CASES[selectedCase];
        if (currentCase) {
            runAnalysis(currentCase);
        }
    }, [runAnalysis, selectedCase]);

    const handleAnalyzeRandom = useCallback(() => {
        const randomCase = generateRandomTestCase();
        // We don't change the selectedCase in the dropdown for random runs
        runAnalysis(randomCase);
    }, [runAnalysis]);

    const handleExportPdf = useCallback(async () => {
        if (!clientNode || !graphData || isExporting) return;

        setIsExporting(true);
        try {
            await generatePdfReport(
                clientNode,
                graphData,
                aiExplanation,
                visualizationContainerRef.current,
                viewMode
            );
        } catch (e) {
            console.error("Failed to generate PDF report:", e);
            setError("Could not generate the PDF report. See console for details.");
        } finally {
            setIsExporting(false);
        }
    }, [clientNode, graphData, aiExplanation, viewMode, isExporting]);
    
    const ViewToggle = () => (
        <div className="absolute top-4 right-4 z-10 bg-white p-1 rounded-md shadow-md flex space-x-1">
            <button 
                onClick={() => setViewMode('graph')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'graph' ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                aria-pressed={viewMode === 'graph'}
            >
                Graph
            </button>
            <button 
                onClick={() => setViewMode('orgchart')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'orgchart' ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                aria-pressed={viewMode === 'orgchart'}
            >
                Org Chart
            </button>
            <button 
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-sm font-medium rounded ${viewMode === 'table' ? 'bg-brand-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                aria-pressed={viewMode === 'table'}
            >
                Data Table
            </button>
        </div>
    );

    const renderContent = () => {
        if (!graphData) return null;

        const clientId = clientNode?.id || '';

        switch (viewMode) {
            case 'graph':
                return <GraphVisualization graphData={graphData} clientNodeId={clientId} />;
            case 'orgchart':
                return <OrgChartVisualization graphData={graphData} clientNodeId={clientId} />;
            case 'table':
                return <DataTable graphData={graphData} />;
            default:
                return <GraphVisualization graphData={graphData} clientNodeId={clientId} />;
        }
    };

    return (
        <div className="flex flex-col h-screen font-sans text-gray-800">
            <header className="bg-brand-primary text-white p-4 shadow-md z-20">
                <h1 className="text-2xl font-bold">Client Risk Network Analyzer</h1>
            </header>
            <main className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/3 lg:w-1/4 h-1/2 md:h-full overflow-y-auto bg-white border-r border-gray-200 p-4 shadow-lg z-10">
                    <ControlPanel
                        selectedCase={selectedCase}
                        onCaseChange={setSelectedCase}
                        clientNode={clientNode}
                        aiExplanation={aiExplanation}
                        isLoading={isLoading}
                        isExporting={isExporting}
                        onAnalyzeSelected={handleAnalyzeSelected}
                        onAnalyzeRandom={handleAnalyzeRandom}
                        onExportReport={handleExportPdf}
                    />
                </div>
                <div ref={visualizationContainerRef} className="flex-1 h-1/2 md:h-full bg-gray-50 relative">
                    {isLoading ? (
                         <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75 z-20">
                            <div className="flex flex-col items-center">
                                <svg className="animate-spin h-10 w-10 text-brand-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <p className="mt-4 text-lg font-semibold text-gray-600">Analyzing Network...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="absolute inset-0 flex items-center justify-center p-4">
                            <p className="text-red-500 bg-red-100 border border-red-400 rounded-md p-4 text-center">{error}</p>
                        </div>
                    ) : (
                        <>
                            <ViewToggle />
                            {renderContent()}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default App;