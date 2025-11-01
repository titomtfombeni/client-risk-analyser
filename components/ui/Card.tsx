
import React, { ReactNode } from 'react';

interface CardProps {
    children: ReactNode;
    className?: string;
}

const CardHeader: React.FC<{ children: ReactNode }> = ({ children }) => (
    <div className="border-b border-gray-200 px-4 py-3">{children}</div>
);

const CardContent: React.FC<{ children: ReactNode }> = ({ children }) => (
    <div className="p-4">{children}</div>
);

export const Card: React.FC<CardProps> & { Header: typeof CardHeader; Content: typeof CardContent } = ({ children, className = '' }) => {
    return (
        <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
            {children}
        </div>
    );
};

Card.Header = CardHeader;
Card.Content = CardContent;
