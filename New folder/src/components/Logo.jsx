import React from 'react';
import logoImg from '../assets/logo.png';

export default function Logo({ size = 48, showText = false, textClass = '' }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
      <img
        src={logoImg}
        alt="Legal Mind Logo"
        className="logo-image"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: 'contain',
          flexShrink: 0
        }}
      />
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span
            className={`brand-font ${textClass}`}
            style={{
              fontSize: '18px',
              fontWeight: 'bold',
              letterSpacing: '2px',
              color: 'var(--color-logo-title, #5E4B3B)'
            }}
          >
            LEGAL
          </span>
          <span
            className="brand-font"
            style={{
              fontSize: '11px',
              fontWeight: 'bold',
              letterSpacing: '3px',
              color: 'var(--color-logo-subtitle, #6B7B84)'
            }}
          >
            MIND
          </span>
        </div>
      )}
    </div>
  );
}
