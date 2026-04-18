'use client';

import React from 'react';
import Skeleton from './Skeleton';

const StocksDashboardSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* HEADER SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '0.5rem' }}>
        <Skeleton width={350} height={36} borderRadius="8px" />
        <Skeleton width={500} height={20} borderRadius="8px" style={{ marginTop: '-1rem' }} />
      </div>

      {/* STICKY FILTER COMMMAND CENTER MOCKUP */}
      <div className="sticky-col" style={{ 
        position: 'sticky', top: 0, zIndex: 50, padding: '12px', borderRadius: '12px', 
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', 
        backgroundColor: 'rgba(10,10,10,0.85)', marginBottom: '1rem' 
      }}>
         <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
            <Skeleton width={120} height={36} borderRadius="8px" />
            <Skeleton width={120} height={36} borderRadius="8px" />
            <div style={{ display: 'flex', gap: '8px', marginLeft: '8px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                <Skeleton width={80} height={28} borderRadius="20px" />
                <Skeleton width={80} height={28} borderRadius="20px" />
                <Skeleton width={80} height={28} borderRadius="20px" />
            </div>
            <Skeleton width={250} height={36} borderRadius="20px" style={{ flex: '1 1 220px' }} />
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Skeleton width={150} height={32} borderRadius="8px" />
            <Skeleton width={36} height={36} borderRadius="8px" />
         </div>
      </div>

      {/* RENTA VARIABLE VISUALIZATIONS GRID */}
      <div className="dashboard-content grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sunburst Skeleton */}
        <div className="premium-glass panel-glow" style={{ padding: '1.5rem', height: '680px', marginBottom: '2rem' }}>
            <Skeleton width={250} height={24} style={{ marginBottom: '1.5rem' }} />
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '550px' }}>
                <Skeleton width={450} height={450} borderRadius="50%" />
            </div>
        </div>

        {/* Heatmap Skeleton */}
        <div className="premium-glass panel-glow" style={{ padding: '1.5rem', height: '680px', marginBottom: '2rem' }}>
            <Skeleton width={250} height={24} style={{ marginBottom: '1.5rem' }} />
            <Skeleton width="100%" height={600} borderRadius="4px" />
        </div>
      </div>

      {/* SCATTER CHART SKELETON */}
      <div className="dashboard-content w-full">
        <div className="premium-glass panel-glow" style={{ padding: '1.5rem', marginBottom: '2rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <Skeleton width={300} height={24} />
                <Skeleton width={200} height={16} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                 <Skeleton width="1000px" height="850px" style={{ maxWidth: '100%' }} />
            </div>
        </div>
      </div>

      {/* TABLE SKELETON */}
      <div className="dashboard-content">
        <div className="premium-table-container" style={{ marginTop: '0' }}>
            <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    {[...Array(6)].map((_, i) => <Skeleton key={i} width={`${100/6}%`} height={20} />)}
                </div>
                {[...Array(10)].map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                        {[...Array(6)].map((_, j) => <Skeleton key={j} width={`${100/6}%`} height={24} />)}
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StocksDashboardSkeleton;
