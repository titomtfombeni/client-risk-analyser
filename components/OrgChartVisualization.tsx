
import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphData, AnalyzedNodeData } from '../types';
import { getRiskColor } from '../constants';

interface OrgChartVisualizationProps {
    graphData: GraphData;
    clientNodeId: string;
}

// A custom interface for nodes in the hierarchy, including children
interface HierarchyNode extends AnalyzedNodeData {
    children?: HierarchyNode[];
}

// Function to build a hierarchical data structure from flat graph data
const buildHierarchyData = (graphData: GraphData): HierarchyNode => {
    const { nodes, edges } = graphData;
    const ownershipEdges = edges.filter(edge => edge.relationship === 'OWNS');
    
    // Create a map for easy lookup and to attach children
    const nodeMap = new Map<string, HierarchyNode>();
    nodes.forEach(node => {
        nodeMap.set(node.id, { ...node, children: [] });
    });

    // Populate children arrays based on ownership edges
    ownershipEdges.forEach(edge => {
        const parent = nodeMap.get(edge.source);
        const child = nodeMap.get(edge.target);
        if (parent && child) {
            parent.children?.push(child);
        }
    });

    // Identify root nodes (those not owned by anyone in the network)
    const childrenIds = new Set(ownershipEdges.map(edge => edge.target));
    const rootNodes: HierarchyNode[] = [];
    nodes.forEach(node => {
        if (!childrenIds.has(node.id)) {
            const rootNode = nodeMap.get(node.id);
            if(rootNode) rootNodes.push(rootNode);
        }
    });

    // If multiple roots or no clear roots, create a virtual root to contain them all
    if (rootNodes.length !== 1) {
        return {
            id: 'Ownership Structure',
            type: 'Corporate', // Dummy data
            jurisdiction: 'N/A',
            depth: -1,
            base_risk: 0,
            base_risk_reasons: [],
            final_risk_score: 0,
            risk_category: 'Low',
            children: rootNodes,
        };
    }
    
    return rootNodes[0];
};


export const OrgChartVisualization: React.FC<OrgChartVisualizationProps> = ({ graphData, clientNodeId }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || !graphData) return;

        const hierarchyData = buildHierarchyData(graphData);
        // Do not render if there is no data to show
        if (!hierarchyData || (!hierarchyData.children || hierarchyData.children.length === 0)) {
             d3.select(svgRef.current).selectAll("*").remove(); 
             const svg = d3.select(svgRef.current);
             svg.append("text")
                .attr("x", "50%")
                .attr("y", "50%")
                .attr("text-anchor", "middle")
                .attr("font-size", "16px")
                .attr("fill", "#6b7280")
                .text("No ownership data to display in organogram.");
            return;
        }

        const root = d3.hierarchy(hierarchyData);
        
        const { width, height } = containerRef.current.getBoundingClientRect();
        const svg = d3.select(svgRef.current).attr('width', width).attr('height', height);
        svg.selectAll("*").remove();

        const g = svg.append("g");

        const treeLayout = d3.tree<HierarchyNode>().nodeSize([150, 300]);
        treeLayout(root);

        const links = g.append("g")
            .attr("fill", "none")
            .attr("stroke", "#9ca3af")
            .attr("stroke-opacity", 0.8)
            .attr("stroke-width", 1.5)
            .selectAll("path")
            .data(root.links())
            .join("path")
            .attr("d", d3.linkVertical()
                .x(d => (d as any).x)
                .y(d => (d as any).y));
        
        const nodes = g.append("g")
            .selectAll("g")
            .data(root.descendants())
            .join("g")
            .attr("transform", d => `translate(${d.x},${d.y})`);

        nodes.append("circle")
            .attr("fill", d => getRiskColor(d.data.final_risk_score))
            .attr("stroke", d => d.data.id === clientNodeId ? '#1e40af' : '#fff')
            .attr("stroke-width", d => d.data.id === clientNodeId ? 4 : 2)
            .attr("r", 20);

        nodes.append("text")
            .attr("dy", "0.31em")
            .attr("y", 35)
            .attr("text-anchor", "middle")
            .attr("font-size", 10)
            .attr("font-weight", "bold")
            .attr("fill", "#1f2937")
            .selectAll("tspan")
            .data(d => d.data.id.split(' ').slice(0, 3)) // Show first 3 words
            .join("tspan")
            .attr("x", 0)
            .attr("dy", (d,i) => i > 0 ? "1.2em" : 0)
            .text(d => d);

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

        nodes.on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                   .html(`
                     <strong>ID:</strong> ${d.data.id}<br/>
                     <strong>Type:</strong> ${d.data.type}<br/>
                     <strong>Jurisdiction:</strong> ${d.data.jurisdiction.toUpperCase()}<br/>
                     <strong>Score:</strong> ${d.data.final_risk_score}<br/>
                     <strong>Reasons:</strong> ${d.data.base_risk_reasons.join(', ') || 'N/A'}
                   `);
        })
        .on("mousemove", (event) => {
            tooltip.style("top", (event.pageY - 10) + "px").style("left", (event.pageX + 10) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });
        
        // Zoom and Pan
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 2])
            .on('zoom', (event) => {
                g.attr('transform', event.transform.toString());
            });

        // Center the graph initially
        const bounds = g.node()!.getBBox();
        const parent = svg.node()!.parentElement!;
        const fullWidth = parent.clientWidth;
        const fullHeight = parent.clientHeight;
        const initialScale = Math.min(fullWidth / bounds.width, fullHeight / bounds.height) * 0.9;
        const initialX = fullWidth / 2 - (bounds.x + bounds.width / 2) * initialScale;
        const initialY = 50; // Add some top margin

        svg.call(zoom as any)
            .call(zoom.transform as any, d3.zoomIdentity.translate(initialX, initialY).scale(initialScale));


        return () => {
            tooltip.remove();
        };

    }, [graphData, clientNodeId]);

    return (
        <div ref={containerRef} className="w-full h-full bg-gray-50">
            <svg ref={svgRef}></svg>
        </div>
    );
};
