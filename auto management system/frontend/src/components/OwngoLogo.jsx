import React from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Official OWNGO Logo Component
 * Supports dark & light themes seamlessly with high-resolution imagery and fallback SVG.
 */
const OwngoLogo = ({
  size = 'sidebar', // 'small' | 'sidebar' | 'large' | 'icon'
  showTagline = true,
  className = '',
  style = {}
}) => {
  const { isDark } = useTheme();

  // Dimensions based on size
  let height = 40;
  if (size === 'small') height = 28;
  if (size === 'icon') height = 36;
  if (size === 'sidebar') height = 42;
  if (size === 'large') height = 68;

  // Select optimal source based on theme
  // In dark mode: transparent version with crisp white letters + electric green GO
  // In light mode: light version with dark charcoal letters + electric green GO
  const logoSrc = isDark ? '/logo-owngo-transparent.png' : '/logo-owngo-light.png';

  if (size === 'icon') {
    return (
      <div
        className={`owngo-icon-wrapper ${className}`}
        style={{
          width: height,
          height: height,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #70bf00 0%, #a2f218 100%)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(132, 216, 2, 0.4)',
          flexShrink: 0,
          ...style
        }}
        title="OWNGO"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="#070908"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Stylized electric bolt */}
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="#070908" />
        </svg>
      </div>
    );
  }

  return (
    <div
      className={`owngo-logo-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style
      }}
    >
      <img
        src={logoSrc}
        alt="OWNGO — Own • Earn • Grow"
        style={{
          height: height,
          width: 'auto',
          maxWidth: '100%',
          objectFit: 'contain',
          display: 'block',
          filter: isDark 
            ? 'drop-shadow(0 2px 10px rgba(132, 216, 2, 0.25))' 
            : 'drop-shadow(0 2px 8px rgba(95, 165, 0, 0.2))',
          transition: 'filter 0.3s ease, opacity 0.2s ease'
        }}
        onError={(e) => {
          // Fallback to text + svg if image fails
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.parentElement.querySelector('.owngo-text-fallback');
          if (fallback) fallback.style.display = 'flex';
        }}
      />

      {/* High-fidelity CSS/SVG Fallback */}
      <div
        className="owngo-text-fallback"
        style={{
          display: 'none',
          flexDirection: 'column',
          alignItems: 'flex-start'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, fontWeight: 900, letterSpacing: '0.05em', lineHeight: 1 }}>
          <span style={{ color: isDark ? '#ffffff' : '#0f172a', fontSize: height * 0.45 }}>OWN</span>
          <span style={{ color: '#84d802', fontSize: height * 0.45 }}>GO</span>
          <span style={{ color: '#84d802', fontSize: height * 0.4, marginLeft: 2 }}>⚡</span>
        </div>
        {showTagline && (
          <div
            style={{
              fontSize: height * 0.18,
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: isDark ? '#94a3b8' : '#475569',
              marginTop: 2,
              textTransform: 'uppercase'
            }}
          >
            OWN • EARN • GROW
          </div>
        )}
      </div>
    </div>
  );
};

export default OwngoLogo;
