import React, { useState } from 'react';

const FRAME = { width: 390, height: 844 };

export const DeviceFrame: React.FC = () => {
  const [bleed, setBleed] = useState(false);
  const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  qs.set('embed', '1');
  const src =
    (typeof location !== 'undefined' ? location.pathname : '/') + '?' + qs.toString();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#1c1c1e', padding: 16, gap: 12, minHeight: '100vh', boxSizing: 'border-box' }}>
      <button data-testid="frame-bleed-toggle" onClick={() => setBleed(b => !b)}
        style={{ alignSelf: 'flex-end', padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
        {bleed ? 'Phone frame' : 'Full bleed'}
      </button>
      <iframe title="auxi web review" src={src} style={{
        width: bleed ? '100%' : FRAME.width, height: bleed ? '90vh' : FRAME.height,
        border: 'none', borderRadius: bleed ? 0 : 44,
        boxShadow: bleed ? 'none' : '0 8px 40px rgba(0,0,0,0.5)', background: '#fff' }} />
    </div>
  );
};
