import React, { useState } from 'react';
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

export const DeviceFrame: React.FC = () => {
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

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: '#1c1c1e',
        padding: 16,
        gap: 12,
        minHeight: '100vh',
        boxSizing: 'border-box',
        overflow: 'auto',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        <select
          data-testid="screen-select"
          value={screenKey}
          onChange={onScreen}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
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
            padding: '7px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
            background: copied ? '#34c759' : '#fff',
            color: copied ? '#fff' : '#000',
            fontWeight: 600,
          }}
        >
          {copied ? 'Copied!' : 'Copy link'}
        </button>
        <select
          data-testid="device-select"
          value={idx}
          onChange={onDevice}
          style={{
            padding: '7px 10px',
            borderRadius: 8,
            border: 'none',
            fontSize: 14,
            cursor: 'pointer',
          }}
        >
          {DEVICES.map((dev, i) => (
            <option key={i} value={i}>
              {dev.label} — {dev.w}×{dev.h}
            </option>
          ))}
        </select>
        <button
          data-testid="frame-bleed-toggle"
          onClick={() => setBleed(b => !b)}
          style={{
            padding: '7px 12px',
            borderRadius: 8,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {bleed ? 'Device' : 'Full bleed'}
        </button>
      </div>
      <iframe
        key={`${idx}-${screenKey}-${bleed}`}
        title="auxi web review"
        src={iframeSrc()}
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
