
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { AnalyzedNodeData, GraphData } from '../types';
import { RISK_LEVELS, getRiskCategory } from '../constants';

const svgToPngDataURL = (svgElement: SVGSVGElement): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Add a white background to the SVG to avoid transparency issues in the PNG
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", "0");
        rect.setAttribute("y", "0");
        rect.setAttribute("width", "100%");
        rect.setAttribute("height", "100%");
        rect.setAttribute("fill", "white");
        svgElement.insertBefore(rect, svgElement.firstChild);

        const xml = new XMLSerializer().serializeToString(svgElement);
        svgElement.removeChild(rect); // Clean up by removing the added background

        const canvas = document.createElement('canvas');
        const { width, height } = svgElement.getBoundingClientRect();
        
        // Use a higher resolution for better quality
        const scale = 2;
        canvas.width = width * scale;
        canvas.height = height * scale;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
        }
        
        ctx.scale(scale, scale);

        const img = new Image();
        const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            const pngDataUrl = canvas.toDataURL('image/png');
            resolve(pngDataUrl);
        };
        
        img.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG image for canvas conversion.'));
        }
        
        img.src = url;
    });
};

export const generatePdfReport = async (
    clientNode: AnalyzedNodeData,
    graphData: GraphData,
    aiExplanation: string,
    visualizationContainer: HTMLDivElement | null,
    viewMode: 'graph' | 'table' | 'orgchart'
) => {
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });
    
    let yPos = 20;
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (pageMargin * 2);

    // Header
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('Client Risk Analysis Report', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${clientNode.id}`, pageMargin, yPos);
    doc.text(`Report Date: ${new Date().toLocaleDateString()}`, pageWidth - pageMargin, yPos, { align: 'right' });
    yPos += 10;

    // --- Risk Summary ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Analysis Summary', pageMargin, yPos);
    yPos += 8;

    const riskCategory = getRiskCategory(clientNode.final_risk_score);
    const riskInfo = RISK_LEVELS[riskCategory];
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Final Rating:', pageMargin + 5, yPos);
    doc.setFillColor(riskInfo.color);
    doc.roundedRect(pageMargin + 40, yPos - 4, 30, 6, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(riskCategory, pageMargin + 40 + 15, yPos, { align: 'center' });
    
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text('Risk Score:', pageMargin + 100, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(clientNode.final_risk_score.toString(), pageMargin + 125, yPos);
    yPos += 10;

    doc.setFont('helvetica', 'bold');
    doc.text('Key Risk Factors:', pageMargin, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const reasons = clientNode.final_risk_reasons && clientNode.final_risk_reasons.length > 0 
        ? clientNode.final_risk_reasons.map(r => `- ${r}`)
        : ['- No significant risk factors identified.'];
    const splitReasons = doc.splitTextToSize(reasons.join('\n'), contentWidth);
    doc.text(splitReasons, pageMargin + 5, yPos);
    yPos += (splitReasons.length * 5) + 5;

    // --- AI Explanation ---
    if (yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('AI-Powered Explanation', pageMargin, yPos);
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const splitExplanation = doc.splitTextToSize(aiExplanation, contentWidth);
    doc.text(splitExplanation, pageMargin, yPos);
    yPos += (splitExplanation.length * 5) + 10;

    // --- Visualization ---
    if (viewMode !== 'table' && visualizationContainer) {
        const svgElement = visualizationContainer.querySelector('svg');
        if (svgElement && svgElement.children.length > 1) { // Check if SVG has content
            if (yPos > 180) { doc.addPage(); yPos = 20; }
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('Network Visualization', pageMargin, yPos);
            yPos += 8;
            
            try {
                const dataUrl = await svgToPngDataURL(svgElement);
                const { width, height } = svgElement.getBoundingClientRect();
                const aspectRatio = width / height;
                const imgWidth = contentWidth;
                const imgHeight = imgWidth / aspectRatio;
                doc.addImage(dataUrl, 'PNG', pageMargin, yPos, imgWidth, imgHeight);
                yPos += imgHeight + 10;
            } catch (e) {
                console.error("Failed to render SVG to image", e);
                doc.text("Could not render visualization.", pageMargin, yPos);
                yPos += 10;
            }
        }
    }
    
    // --- Data Tables ---
    const checkPageBreak = () => {
        if (yPos > 260) {
            doc.addPage();
            yPos = 20;
        }
    };
    
    checkPageBreak();

    autoTable(doc, {
        head: [['Entities (Nodes)']],
        startY: yPos,
        margin: { left: pageMargin, right: pageMargin },
        theme: 'plain',
        styles: { fontSize: 16, fontStyle: 'bold' }
    });
    
    autoTable(doc, {
        head: [['ID', 'Type', 'Jurisdiction', 'Base Risk', 'Final Score']],
        body: graphData.nodes.map(n => [n.id, n.type, n.jurisdiction.toUpperCase(), n.base_risk, n.final_risk_score]),
        startY: (doc as any).lastAutoTable.finalY + 2,
        margin: { left: pageMargin, right: pageMargin },
        headStyles: { fillColor: [30, 64, 175] }, // brand-primary color
        didDrawPage: (data: any) => { yPos = data.cursor.y; }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
    
    checkPageBreak();

    autoTable(doc, {
        head: [['Relationships (Edges)']],
        startY: yPos,
        margin: { left: pageMargin, right: pageMargin },
        theme: 'plain',
        styles: { fontSize: 16, fontStyle: 'bold' }
    });

    autoTable(doc, {
        head: [['Source', 'Target', 'Relationship', 'Ownership %']],
        body: graphData.edges.map(e => [e.source, e.target, e.relationship, e.percentage ? `${e.percentage}%` : 'N/A']),
        startY: (doc as any).lastAutoTable.finalY + 2,
        margin: { left: pageMargin, right: pageMargin },
        headStyles: { fillColor: [30, 64, 175] },
        didDrawPage: (data: any) => { yPos = data.cursor.y; }
    });

    doc.save(`Client_Risk_Report_${clientNode.id.replace(/\s/g, '_')}.pdf`);
};