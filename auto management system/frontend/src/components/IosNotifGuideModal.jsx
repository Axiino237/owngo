import React from 'react';
import { RiCloseLine, RiAppleFill, RiNotification3Line, RiShareBoxLine, RiAddBoxLine } from 'react-icons/ri';

const IosNotifGuideModal = ({ isOpen, onClose, onEnableInApp }) => {
  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--bg-card, #0f172a)',
          border: '1px solid var(--border, #334155)',
          borderRadius: 16,
          maxWidth: 440,
          width: '100%',
          padding: '24px 20px',
          color: 'var(--text-primary, #fff)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '1.25rem'
            }}>
              <RiAppleFill />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>iPhone Notification Setup</h3>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94a3b8)' }}>iOS Web Push & Sound Guide</div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-muted, #94a3b8)', 
              fontSize: '1.4rem', 
              cursor: 'pointer', 
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <RiCloseLine />
          </button>
        </div>

        {/* Apple Restriction Explanation */}
        <div style={{ 
          background: 'rgba(59, 130, 246, 0.1)', 
          border: '1px solid rgba(59, 130, 246, 0.25)', 
          borderRadius: 10, 
          padding: '10px 12px', 
          fontSize: '0.78rem', 
          lineHeight: 1.45, 
          marginBottom: 16,
          color: '#cbd5e1'
        }}>
          Apple iOS rules-padi, <strong>Safari / Chrome browser tabs</strong>-la direct phone lockscreen notification allow aagaadhu. 
          Phone lockscreen-la notifications varanum-na <strong>Add to Home Screen</strong> panni open pannanum.
        </div>

        {/* Step-by-Step Instructions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 800, flexShrink: 0 }}>1</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
              Safari browser-la indha website-ah open pannunga (Chrome-la irundha Safari-ku URL copy panni paste pannunga).
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 800, flexShrink: 0 }}>2</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
              Safari-yin keezh pagudhiyil irukkum <strong>Share icon (📤)</strong> click pannunga.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 800, flexShrink: 0 }}>3</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
              Menu-vil keela scroll panni <strong>"Add to Home Screen" (முகப்புத்திரையில் சேர்)</strong> select panni Add pannunga.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.76rem', fontWeight: 800, flexShrink: 0 }}>4</div>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
              Unga iPhone Home Screen-la create aana <strong>OWNGO</strong> app-ah open panni, <strong>Alerts ON</strong> pannunga! Apple native push notification enable aagidum!
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button
            onClick={() => {
              if (onEnableInApp) onEnableInApp();
              onClose();
            }}
            style={{
              width: '100%',
              padding: '11px 14px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <RiNotification3Line style={{ fontSize: '1.1rem' }} />
            Turn ON In-App Sound Alerts (Browser Tab)
          </button>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '9px 14px',
              background: 'transparent',
              color: 'var(--text-muted, #94a3b8)',
              border: '1px solid var(--border, #334155)',
              borderRadius: 8,
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IosNotifGuideModal;
