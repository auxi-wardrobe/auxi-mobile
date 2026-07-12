import React, { useMemo, useState } from 'react';
import { GROUP_ORDER, SHAREABLE_SCREENS } from '../share/shareable-screens';
import { SCREEN_PARAM } from '../share/screen-intent';

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
const DEVICE_PARAM = 'device';

const readParam = (key: string): string | null => {
  try {
    return new URLSearchParams(location.search).get(key);
  } catch {
    return null;
  }
};

// On a real phone the device-frame simulation is pointless (the phone IS the
// device) and a fixed-size iframe traps scrolling — so there we render the app
// full-viewport so it scrolls naturally, and tuck the controls behind one
// button to keep the small screen clear.
const detectMobile = (): boolean => {
  try {
    return window.matchMedia('(max-width: 700px), (pointer: coarse)').matches;
  } catch {
    return false;
  }
};

const selectStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: 'none',
  fontSize: 14,
  cursor: 'pointer',
  maxWidth: 240,
};
const btnStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: 8,
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
};

export const DeviceFrame: React.FC = () => {
  const isMobile = useMemo(detectMobile, []);
  const [idx, setIdx] = useState<number>(() => {
    const fromUrl = Number(readParam(DEVICE_PARAM));
    if (Number.isInteger(fromUrl) && fromUrl >= 0 && fromUrl < DEVICES.length) {
      return fromUrl;
    }
    try {
      const s = localStorage.getItem('reviewDeviceIdx');
      return s != null ? Number(s) : DEFAULT_INDEX;
    } catch {
      return DEFAULT_INDEX;
    }
  });
  const [screenKey, setScreenKey] = useState<string>(
    () => readParam(SCREEN_PARAM) ?? '',
  );
  const [bleed, setBleed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const d = DEVICES[idx] || DEVICES[DEFAULT_INDEX];

  // The OUTER url is the shareable link — keep it in sync with the current
  // screen + device so "Copy link" / the address bar always reflect the view.
  const syncOuterUrl = (nextIdx: number, nextScreen: string) => {
    try {
      const qs = new URLSearchParams(location.search);
      qs.set(DEVICE_PARAM, String(nextIdx));
      if (nextScreen) {
        qs.set(SCREEN_PARAM, nextScreen);
      } else {
        qs.delete(SCREEN_PARAM);
      }
      history.replaceState(null, '', location.pathname + '?' + qs.toString());
    } catch {
      /* noop */
    }
  };

  // iframe src = current outer params + embed=1. The `screen` param passes
  // straight through to the embedded app; `device` is an outer-only concern.
  const iframeSrc = () => {
    const qs = new URLSearchParams(
      typeof location !== 'undefined' ? location.search : '',
    );
    qs.set('embed', '1');
    qs.delete(DEVICE_PARAM);
    const path = typeof location !== 'undefined' ? location.pathname : '/';
    return path + '?' + qs.toString();
  };

  const onDevice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = Number(e.target.value);
    setIdx(v);
    try {
      localStorage.setItem('reviewDeviceIdx', String(v));
    } catch {
      /* noop */
    }
    syncOuterUrl(v, screenKey);
  };

  const onScreen = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const v = e.target.value;
    setScreenKey(v);
    setCopied(false);
    syncOuterUrl(idx, v);
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — noop */
    }
  };

  // Every control lives in one place, revealed by a single button. On mobile
  // the device + bleed controls are irrelevant (the app is always full-screen),
  // so only the Screen picker + Copy show.
  const controls = (
    <div
      data-testid="review-controls"
      style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
    >
      <select
        data-testid="screen-select"
        value={screenKey}
        onChange={onScreen}
        style={selectStyle}
      >
        <option value="">— Default (Home) —</option>
        {GROUP_ORDER.map(g => (
          <optgroup key={g} label={g}>
            {SHAREABLE_SCREENS.filter(s => s.group === g).map(s => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        data-testid="copy-link"
        onClick={onCopy}
        style={{
          ...btnStyle,
          background: copied ? '#34c759' : '#fff',
          color: copied ? '#fff' : '#000',
        }}
      >
        {copied ? 'Copied!' : 'Copy link'}
      </button>
      {!isMobile && (
        <select
          data-testid="device-select"
          value={idx}
          onChange={onDevice}
          style={selectStyle}
        >
          {DEVICES.map((dev, i) => (
            <option key={i} value={i}>
              {dev.label} — {dev.w}×{dev.h}
            </option>
          ))}
        </select>
      )}
      {!isMobile && (
        <button
          data-testid="frame-bleed-toggle"
          onClick={() => setBleed(b => !b)}
          style={{ ...btnStyle, background: '#fff', color: '#000' }}
        >
          {bleed ? 'Device frame' : 'Full bleed'}
        </button>
      )}
    </div>
  );

  const toggle = (
    <button
      data-testid="controls-toggle"
      onClick={() => setOpen(o => !o)}
      style={{
        ...btnStyle,
        position: 'fixed',
        top: 'calc(10px + env(safe-area-inset-top))',
        right: 10,
        zIndex: 20,
        background: open ? '#fff' : 'rgba(28,28,30,0.92)',
        color: open ? '#000' : '#fff',
        border: open ? 'none' : '1px solid rgba(255,255,255,0.3)',
      }}
    >
      {open ? '✕ Close' : '⚙ Screens'}
    </button>
  );

  const panel = open ? (
    <div
      style={{
        position: 'fixed',
        top: 'calc(56px + env(safe-area-inset-top))',
        right: 10,
        zIndex: 20,
        background: '#1c1c1e',
        padding: 12,
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
        maxWidth: '82vw',
      }}
    >
      {controls}
    </div>
  ) : null;

  // Mobile: app fills the viewport so it scrolls; controls float above it.
  if (isMobile) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: '#000',
          overflow: 'hidden',
        }}
      >
        <iframe
          key={screenKey}
          title="auxi web review"
          src={iframeSrc()}
          allow="identity-credentials-read"
          style={{
            width: '100vw',
            height: '100dvh',
            border: 'none',
            display: 'block',
            background: '#fff',
          }}
        />
        {toggle}
        {panel}
      </div>
    );
  }

  // Desktop: centered device frame, controls behind the same single button.
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1c1c1e',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        boxSizing: 'border-box',
      }}
    >
      {toggle}
      {panel}
      <iframe
        key={`${idx}-${screenKey}-${bleed}`}
        title="auxi web review"
        src={iframeSrc()}
        allow="identity-credentials-read"
        style={{
          width: bleed ? '100%' : d.w,
          height: bleed ? '92vh' : d.h,
          border: 'none',
          borderRadius: bleed ? 0 : 44,
          flex: '0 0 auto',
          boxShadow: bleed ? 'none' : '0 8px 40px rgba(0,0,0,0.5)',
          background: '#fff',
        }}
      />
    </div>
  );
};
