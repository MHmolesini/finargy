'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Bonos (Ar)', path: '/notes', icon: '📝' },
    { name: 'Acciones', path: '/stocks', icon: '📈' },
    { name: 'CEDEARs', path: '/cedears', icon: '🌍' },
    { name: 'Configuración', path: '/settings', icon: '⚙️' },
  ];

  return (
    <aside className="sidebar">
      <div style={{ marginBottom: '2.5rem', paddingLeft: '0.5rem' }}>
        <h1 className="font-outfit" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          FinArg <span style={{ color: 'var(--accent-color)' }}>.</span>
        </h1>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-dim)',
                backgroundColor: isActive ? 'var(--accent-dim)' : 'transparent',
                transition: 'all 0.2s ease',
                fontSize: '0.9rem',
                fontWeight: isActive ? 500 : 400,
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.color = '#fff';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-dim)';
                }
              }}
            >
              <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Mercado Abierto</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></div>
          <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>BA - BCBA</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
