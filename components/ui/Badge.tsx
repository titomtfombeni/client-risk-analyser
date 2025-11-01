
import React from 'react';
import type { RiskCategory } from '../../types';

interface BadgeProps {
    category: RiskCategory;
    children: React.ReactNode;
}

const categoryClasses: { [key in RiskCategory]: string } = {
    Prohibited: 'bg-prohibited/20 text-prohibited-800 border-prohibited',
    High: 'bg-high/20 text-high-800 border-high',
    Medium: 'bg-medium/20 text-medium-800 border-medium',
    Low: 'bg-low/20 text-low-800 border-low',
};

export const Badge: React.FC<BadgeProps> = ({ category, children }) => {
    const classes = categoryClasses[category] || 'bg-gray-100 text-gray-800 border-gray-400';
    return (
        <span className={`px-3 py-1 text-sm font-semibold rounded-full border ${classes}`}>
            {children}
        </span>
    );
};
