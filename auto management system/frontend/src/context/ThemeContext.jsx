import React, { createContext, useContext, useState, useEffect } from 'react';
import { RiSunLine, RiMoonLine } from 'react-icons/ri';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('owngo_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      console.warn('Could not read saved theme:', e);
    }
    return 'dark'; // Default to dark mode (matches OWNGO logo aesthetic)
  });

  const applyTheme = (newTheme) => {
    try {
      document.documentElement.setAttribute('data-theme', newTheme);
      document.body.classList.remove('theme-dark', 'theme-light');
      document.body.classList.add(`theme-${newTheme}`);
      
      // Update meta theme-color for browser tab / mobile status bar
      let metaTheme = document.querySelector('meta[name="theme-color"]');
      if (!metaTheme) {
        metaTheme = document.createElement('meta');
        metaTheme.name = 'theme-color';
        document.head.appendChild(metaTheme);
      }
      metaTheme.content = newTheme === 'dark' ? '#060907' : '#f5f7f5';
    } catch (e) {
      console.warn('Failed to apply theme to document:', e);
    }
  };

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('owngo_theme', theme);
    } catch (e) {
      console.warn('Could not persist theme:', e);
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (newTheme) => {
    if (newTheme === 'dark' || newTheme === 'light') {
      setThemeState(newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

/**
 * Modern pill-style or icon button switch for toggling dark/light theme
 */
export const ThemeToggle = ({ className = '', showLabel = false, size = 'normal' }) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label="Toggle dark/light mode"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: size === 'small' ? 32 : 38,
        padding: showLabel ? '0 12px' : '0 10px',
        minWidth: size === 'small' ? 32 : 38,
        borderRadius: 10,
        background: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
        border: '1px solid var(--border)',
        color: 'var(--text-primary)',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        fontSize: size === 'small' ? '0.95rem' : '1.1rem',
        userSelect: 'none',
        flexShrink: 0
      }}
    >
      {isDark ? (
        <RiSunLine style={{ color: '#facc15', transition: 'transform 0.3s ease' }} />
      ) : (
        <RiMoonLine style={{ color: '#5fa500', transition: 'transform 0.3s ease' }} />
      )}
      {showLabel && (
        <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
};

export default ThemeContext;
