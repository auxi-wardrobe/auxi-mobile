import React, { useState } from 'react';

type Device = { label: string; w: number; h: number };

// Logical (CSS-point) portrait viewport sizes per model.
const DEVICES: Device[] = [
  { label: 'iPhone 12 mini', w: 360, h: 780 },
  { label: 'iPhone 12 / 12 Pro', w: 390, h: 844 },
  { label: 'iPhone 12 Pro Max', w: 428, h: 926 },
  { label: 'iPhone 13 mini', w: 375, h: 812 },
  { label: 'iPhone 13 / 13 Pro', w: 390, h: 844 },
  { label: 'iPhone 13 Pro Max', w: 428, h: 926 },
  { label: 'iPhone 14', w: 390, h: 844 },
  { label: 'iPhone 14 Plus', w: 428, h: 926 },
  { label: 'iPhone 14 Pro', w: 393, h: 852 },
  { label: 'iPhone 14 Pro Max', w: 430, h: 932 },
  { label: 'iPhone 15 / 15 Pro', w: 393, h: 852 },
  { label: 'iPhone 15 Plus / 15 Pro Max', w: 430, h: 932 },
  { label: 'iPhone 16', w: 393, h: 852 },
  { label: 'iPhone 16 Plus', w: 430, h: 932 },
  { label: 'iPhone 16 Pro', w: 402, h: 874 },
  { label: 'iPhone 16 Pro Max', w: 440, h: 956 },
  { label: 'iPhone 17', w: 402, h: 874 },
  { label: 'iPhone 17 Pro', w: 402, h: 874 },
  { label: 'iPhone 17 Pro Max', w: 440, h: 956 },
  { label: 'iPhone 18 (est.)', w: 402, h: 874 },
  { label: 'iPhone 18 Pro Max (est.)', w: 440, h: 956 },
];
const DEFAULT_INDEX = 10; // iPhone 15 / 15 Pro

export const DeviceFrame: React.FC = () => {
  const [idx, setIdx] = useState<number>(() => {
    try {
      const s = localStorage.getItem('reviewDeviceIdx');
      return s != null ? Number(s) : DEFAULT_INDEX;
    } catch {
      return DEFAULT_INDEX;
    }
  });
  const [bleed, setBleed] = useState(false);
  const d = DEVICES[idx] || DEVICES[DEFAULT_INDEX];

  const qs = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  qs.set('embed', '1');
  const src =
    (typeof location !== 'undefined' ? location.pathname : '/') + '?' + qs.toString();

  const onSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = Number(e.target.value);
    setIdx(v);
    try { localStorage.setItem('reviewDeviceIdx', String(v)); } catch {}
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#1c1c1e', padding: 16, gap: 12, minHeight: '100vh', boxSizing: 'border-box', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <select data-testid="device-select" value={idx} onChange={onSelect}
          style={{ padding: '7px 10px', borderRadius: 8, border: 'none', fontSize: 14, cursor: 'pointer' }}>
          {DEVICES.map((dev, i) => (
            <option key={i} value={i}>{dev.label} — {dev.w}×{dev.h}</option>
          ))}
        </select>
        <button data-testid="frame-bleed-toggle" onClick={() => setBleed(b => !b)}
          style={{ padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
          {bleed ? 'Device' : 'Full bleed'}
        </button>
      </div>
      <iframe key={`${idx}-${bleed}`} title="auxi web review" src={src} style={{
        width: bleed ? '100%' : d.w, height: bleed ? '92vh' : d.h,
        border: 'none', borderRadius: bleed ? 0 : 44, flex: '0 0 auto',
        boxShadow: bleed ? 'none' : '0 8px 40px rgba(0,0,0,0.5)', background: '#fff' }} />
    </div>
  );
};
