import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export function Card({ children, className = '', onClick, hoverable = false }: CardProps) {
  const hoverStyles = hoverable ? 'hover:shadow-lg hover:scale-[1.02] cursor-pointer' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 transition-all ${hoverStyles} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
