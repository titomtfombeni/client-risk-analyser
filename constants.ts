
import type { TestCase, RiskCategory } from './types';

export const ALL_JURISDICTIONS: string[] = ['uk', 'usa', 'germany', 'singapore', 'bvi', 'panama', 'switzerland', 'cyprus', 'malta'];
export const HIGH_RISK_JURISDICTIONS: Set<string> = new Set(['bvi', 'panama', 'cyprus', 'malta']);

export const TEST_CASES: { [key: string]: TestCase } = {
    "alpha": {
        "client_id": "Test Client Alpha",
        "avg_nodes": 8,
        "max_depth": 3,
        "risk_prob": 0.1,
        "circular_prob": 0.0,
        "title": "Simple & Low-Risk Network"
    },
    "bravo": {
        "client_id": "Test Client Bravo",
        "avg_nodes": 20,
        "max_depth": 5,
        "risk_prob": 0.4,
        "circular_prob": 1.0,
        "title": "Complex & High-Risk Network"
    },
    "charlie": {
        "client_id": "Test Client Charlie",
        "avg_nodes": 15,
        "max_depth": 4,
        "risk_prob": 0.8,
        "circular_prob": 0.5,
        "title": "Stress Test (Sanctioned)"
    }
};

export const RISK_LEVELS: { [key in RiskCategory]: { score: number; color: string; class: string } } = {
    Prohibited: { score: 100, color: '#d7263d', class: 'bg-prohibited' },
    High: { score: 75, color: '#f46a25', class: 'bg-high' },
    Medium: { score: 50, color: '#fdbb2d', class: 'bg-medium' },
    Low: { score: 0, color: '#adefbb', class: 'bg-low' },
};

export function getRiskCategory(score: number): RiskCategory {
    if (score >= RISK_LEVELS.Prohibited.score) return "Prohibited";
    if (score >= RISK_LEVELS.High.score) return "High";
    if (score >= RISK_LEVELS.Medium.score) return "Medium";
    return "Low";
}

export function getRiskColor(score: number): string {
    const category = getRiskCategory(score);
    return RISK_LEVELS[category].color;
}
