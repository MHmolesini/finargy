'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  width = '100%', 
  height = '1rem', 
  borderRadius = '8px',
  className = '',
  style 
}) => {
  return (
    <div 
      className={`skeleton ${className}`}
      style={{ 
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius,
        ...style
      }}
    />
  );
};

export default Skeleton;
