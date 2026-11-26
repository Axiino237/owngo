import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '30px 20px',
          textAlign: 'center',
          color: 'var(--text-primary, #f1f5f9)',
          background: 'transparent'
        }}>
          <div style={{
            background: 'var(--bg-card, #111827)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 16,
            padding: '32px 28px',
            maxWidth: 520,
            width: '100%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8, color: '#f87171' }}>
              Something went wrong loading this view
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted, #94a3b8)', marginBottom: 20, lineHeight: 1.5 }}>
              An unexpected error occurred while rendering this section. You can refresh the view or try switching tabs.
            </p>
            {this.state.error?.message && (
              <pre style={{
                background: 'rgba(0,0,0,0.3)',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: '0.72rem',
                color: '#fca5a5',
                overflowX: 'auto',
                textAlign: 'left',
                marginBottom: 20
              }}>
                {this.state.error.message}
              </pre>
            )}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                className="btn btn-outline"
                style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700 }}
              >
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
