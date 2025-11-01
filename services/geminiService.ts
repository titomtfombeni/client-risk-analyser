
import { GoogleGenAI } from "@google/genai";
import type { AnalyzedNodeData, GraphData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const getRiskExplanation = async (clientNode: AnalyzedNodeData, graphData: GraphData): Promise<string> => {
    if (!process.env.API_KEY) {
        return "API key is not configured. Cannot generate AI explanation.";
    }

    const { id, final_risk_score, risk_category, final_risk_reasons } = clientNode;

    const highRiskEntities = graphData.nodes
        .filter(n => n.base_risk >= 50 && n.id !== id)
        .map(n => `- ${n.id} (${n.type}) due to: ${n.base_risk_reasons.join(', ')}`)
        .join('\n');

    const prompt = `
        Act as a senior financial crime compliance analyst.
        Your task is to provide a concise, professional, and easy-to-understand summary explaining a client's risk rating.

        Client Details:
        - Name: ${id}
        - Final Risk Score: ${final_risk_score}
        - Risk Category: ${risk_category}

        Key Risk Factors Identified by the System:
        ${(final_risk_reasons ?? []).map(r => `- ${r}`).join('\n')}

        Other High-Risk Entities in the Ownership Structure:
        ${highRiskEntities || "None"}

        Based on the information above, please generate a summary. The summary should:
        1. Start with a clear statement of the client's final risk rating and score.
        2. Explain the primary reasons for this rating, referencing the key risk factors.
        3. Mention how the complex structure and any high-risk entities contribute to the overall risk profile.
        4. Be formatted for clarity and readability. Do not use markdown formatting.
    `;

    try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
        });

        const text = response.text;
        if (text) {
            return text;
        } else {
            return "The AI model returned an empty response. This could be due to content safety filters or an API issue.";
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw new Error("Failed to generate AI explanation.");
    }
};
