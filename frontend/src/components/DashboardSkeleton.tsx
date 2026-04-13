'use client';

import React from 'react';
import Skeleton from './Skeleton';

const DashboardSkeleton = () => {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* HEADER AND TABS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1rem' }}>
        <Skeleton width={300} height={32} borderRadius="8px" />
        
        {/* MARKET FILTER TOGGLE MOCKup */}
        <div className="glass" style={{ display: 'inline-flex', width: 'fit-content', padding: '0.35rem', borderRadius: '0.75rem', gap: '0.25rem', border: '1px solid rgba(255,255,255,0.05)' }}>
          <Skeleton width={80} height={36} borderRadius="8px" />
          <Skeleton width={80} height={36} borderRadius="8px" />
        </div>
      </div>

      {/* CHART SKELETON */}
      <div className="w-full bg-[#111]/50 backdrop-blur-md rounded-xl border border-[#222] p-4 shadow-xl" style={{ height: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '10px' }}>
            <Skeleton width={200} height={24} />
            <Skeleton width={150} height={24} />
        </div>
        <div style={{ padding: '0 1rem' }}>
            <Skeleton width="100%" height={300} borderRadius="12px" />
        </div>
      </div>

      {/* TABLE SKELETON */}
      <div className="flex-grow min-w-0">
        <div className="premium-table-container" style={{ marginTop: '0', background: 'transparent' }}>
          <div style={{ padding: '1.5rem' }}>
            {/* Header Row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <Skeleton width="15%" height={20} />
                <Skeleton width="10%" height={20} />
                <Skeleton width="10%" height={20} />
                <Skeleton width="15%" height={20} />
                <Skeleton width="15%" height={20} />
                <Skeleton width="10%" height={20} />
                <Skeleton width="10%" height={20} />
                <Skeleton width="15%" height={20} />
            </div>
            
            {/* Table Rows */}
            {[...Array(8)].map((_, i) => (
               <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                  <Skeleton width="15%" height={24} />
                  <Skeleton width="10%" height={24} />
                  <Skeleton width="10%" height={24} />
                  <Skeleton width="15%" height={24} />
                  <Skeleton width="15%" height={24} />
                  <Skeleton width="10%" height={24} />
                  <Skeleton width="10%" height={24} />
                  <Skeleton width="15%" height={24} />
               </div>
            ))}
          </div>
        </div>
      </div>

      {/* HEATMAP SKELETON */}
      <div className="glass rounded-xl border border-[#222] shadow-[0_4px_30px_rgba(0,0,0,0.5)] overflow-hidden p-6" style={{ width: '100%', height: '500px', marginTop: '2rem' }}>
        <div style={{ marginBottom: '2rem' }}>
            <Skeleton width={250} height={28} style={{ marginBottom: '0.5rem' }} />
            <Skeleton width={400} height={16} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', height: '350px' }}>
            <Skeleton width="100%" height="100%" borderRadius="4px" />
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(2, 1fr)', gap: '1rem' }}>
                <Skeleton width="100%" height="100%" borderRadius="4px" />
                <Skeleton width="100%" height="100%" borderRadius="4px" />
            </div>
            <Skeleton width="100%" height="100%" borderRadius="4px" />
            <div style={{ display: 'grid', gridTemplateRows: 'repeat(3, 1fr)', gap: '1rem' }}>
                <Skeleton width="100%" height="100%" borderRadius="4px" />
                <Skeleton width="100%" height="100%" borderRadius="4px" />
                <Skeleton width="100%" height="100%" borderRadius="4px" />
            </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
