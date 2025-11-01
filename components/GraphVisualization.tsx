import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphData, AnalyzedNodeData, EdgeData } from '../types';
import { getRiskColor, getRiskCategory } from '../constants';

interface GraphVisualizationProps {
    graphData: GraphData;
    clientNodeId: string;
}

// Fix: Explicitly define simulation properties on the SimulationNode interface.
// D3 adds these properties dynamically during simulation. This change makes the
// TypeScript compiler aware of them, resolving "property does not exist" errors.
interface SimulationNode extends AnalyzedNodeData, d3.SimulationNodeDatum {
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}
interface SimulationLink extends d3.SimulationLinkDatum<SimulationNode> {
    source: string | SimulationNode;
    target: string | SimulationNode;
    relationship: string;
    percentage?: number;
}

export const GraphVisualization: React.FC<GraphVisualizationProps> = ({ graphData, clientNodeId }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || !graphData) return;

        const { nodes: nodeData, edges: edgeData } = graphData;
        const nodes: SimulationNode[] = JSON.parse(JSON.stringify(nodeData));
        const links: SimulationLink[] = JSON.parse(JSON.stringify(edgeData));
        
        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
        svg.selectAll("*").remove(); 

        const container = svg.append("g");

        const simulation = d3.forceSimulation<SimulationNode>(nodes)
            .force("link", d3.forceLink<SimulationNode, SimulationLink>(links).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-400))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .force("collide", d3.forceCollide().radius(d => (d.id === clientNodeId ? 50 : 40)));

        container.append('defs').selectAll('marker')
            .data(['arrowhead'])
            .enter().append('marker')
            .attr('id', String)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 20)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M0,-5L10,0L0,5')
            .attr('fill', '#999');

        const link = container.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll("line")
            .data(links)
            .join("line")
            .attr('marker-end', 'url(#arrowhead)');
        
        const edgeLabels = container.append("g")
            .selectAll(".edge-label")
            .data(links)
            .enter()
            .append("text")
            .attr("class", "edge-label")
            .attr("font-size", 10)
            .attr("fill", "#555")
            .text(d => d.relationship + (d.percentage ? ` ${d.percentage}%` : ''));

        const node = container.append("g")
            .selectAll("g")
            .data(nodes)
            .join("g")
            .call(drag(simulation));
            
        node.append("circle")
            .attr("r", d => d.id === clientNodeId ? 30 : 20)
            .attr("fill", d => getRiskColor(d.final_risk_score))
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
            .on("mouseover", (event, d) => {
                tooltip.style("visibility", "visible")
                       .html(`
                         <strong>ID:</strong> ${d.id}<br/>
                         <strong>Type:</strong> ${d.type}<br/>
                         <strong>Jurisdiction:</strong> ${d.jurisdiction.toUpperCase()}<br/>
                         <strong>Score:</strong> ${d.final_risk_score}<br/>
                         <strong>Reasons:</strong> ${d.base_risk_reasons.join(', ') || 'N/A'}
                       `);
            })
            .on("mousemove", (event) => {
                tooltip.style("top", (event.pageY-10)+"px").style("left",(event.pageX+10)+"px");
            })
            .on("mouseout", () => {
                tooltip.style("visibility", "hidden");
            });

        const labels = node.append("text")
            .attr("dy", d => d.id === clientNodeId ? 45 : 35)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-weight", "bold")
            .attr("fill", "#333")
            .selectAll("tspan")
            .data(d => {
                const nameParts = d.id.split(' ');
                const riskCat = `(${getRiskCategory(d.final_risk_score)})`;
                if (nameParts.length > 2) {
                    return [nameParts.slice(0, 2).join(' ') + '...', riskCat];
                }
                return [d.id, riskCat];
            })
            .join("tspan")
            .attr("x", 0)
            .attr("dy", (d, i) => i === 0 ? 0 : "1.2em")
            .text(d => d);

        simulation.on("tick", () => {
            link
                .attr("x1", d => (d.source as SimulationNode).x!)
                .attr("y1", d => (d.source as SimulationNode).y!)
                .attr("x2", d => (d.target as SimulationNode).x!)
                .attr("y2", d => (d.target as SimulationNode).y!);
            
            node.attr("transform", d => `translate(${d.x}, ${d.y})`);

            edgeLabels
                .attr("x", d => ((d.source as SimulationNode).x! + (d.target as SimulationNode).x!) / 2)
                .attr("y", d => ((d.source as SimulationNode).y! + (d.target as SimulationNode).y!) / 2);
        });

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                container.attr('transform', event.transform.toString());
            });
        
        svg.call(zoom as any);

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(255, 255, 255, 0.95)")
            .style("border", "1px solid #ccc")
            .style("padding", "8px")
            .style("border-radius", "4px")
            .style("font-size", "12px")
            .style("pointer-events", "none");

        return () => {
            simulation.stop();
            tooltip.remove();
        };

    }, [graphData, clientNodeId]);

    const drag = (simulation: d3.Simulation<SimulationNode, SimulationLink>) => {
        function dragstarted(event: d3.D3DragEvent<any, any, any>, d: SimulationNode) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        }

        function dragged(event: d3.D3DragEvent<any, any, any>, d: SimulationNode) {
            d.fx = event.x;
            d.fy = event.y;
        }

        function dragended(event: d3.D3DragEvent<any, any, any>, d: SimulationNode) {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }

        return d3.drag<any, SimulationNode>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended);
    }
    
    return (
        <div ref={containerRef} className="w-full h-full">
            <svg ref={svgRef}></svg>
        </div>
    );
};