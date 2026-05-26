import React from 'react';
import Svg, { Circle, Defs, G, Line, Mask, Path, Rect } from 'react-native-svg';

// Self-rendered weather icon — replaces the static weather_sun_cloud.png so the
// glyph always matches the real condition and never depends on a bundled raster
// asset. Maps OpenWeather icon codes
// (https://openweathermap.org/weather-conditions) by their leading 2-char group
// plus a day/night suffix (d/n).
//
//   01 clear · 02 few clouds · 03/04 clouds · 09 shower · 10 rain
//   11 thunder · 13 snow · 50 mist  (anything else → plain cloud)
//
// Lives in atoms/ on purpose: its intrinsic artwork colors below are exempt from
// the screen/feature hex-token lint (see scripts/auxi-lint-tokens.sh).
type Props = {
  code?: string; // OpenWeather icon code, e.g. "10d"
  size?: number; // square px, default 32
};

// Intrinsic palette of the illustration (not theme tokens — artwork colors).
const C = {
  sun: '#FBBF24',
  moon: '#CBD3E2',
  cloud: '#C3C8D2',
  cloudDark: '#AAB1BE',
  rain: '#5B9BD5',
  snow: '#8FB3DD',
  bolt: '#F6B23C',
  fog: '#AAB1BE',
};

const SunRays: React.FC<{ cx: number; cy: number; r1: number; r2: number }> = ({
  cx,
  cy,
  r1,
  r2,
}) => (
  <G stroke={C.sun} strokeWidth={1.8} strokeLinecap="round">
    {Array.from({ length: 8 }).map((_, i) => {
      const a = (i * Math.PI) / 4;
      const dx = Math.cos(a);
      const dy = Math.sin(a);
      return (
        <Line
          key={i}
          x1={cx + dx * r1}
          y1={cy + dy * r1}
          x2={cx + dx * r2}
          y2={cy + dy * r2}
        />
      );
    })}
  </G>
);

const Sun: React.FC<{ cx?: number; cy?: number; r?: number }> = ({
  cx = 16,
  cy = 14,
  r = 6,
}) => (
  <>
    <SunRays cx={cx} cy={cy} r1={r + 2.5} r2={r + 5} />
    <Circle cx={cx} cy={cy} r={r} fill={C.sun} />
  </>
);

// Crescent: a filled disc minus an offset disc, cut out via a mask.
const Moon: React.FC = () => (
  <>
    <Defs>
      <Mask id="weather-crescent">
        <Circle cx={15} cy={14} r={7.5} fill="#fff" />
        <Circle cx={19.5} cy={11} r={6.5} fill="#000" />
      </Mask>
    </Defs>
    <Circle
      cx={15}
      cy={14}
      r={7.5}
      fill={C.moon}
      mask="url(#weather-crescent)"
    />
  </>
);

// Three overlapping discs + a flat base read as a cloud silhouette.
const Cloud: React.FC<{ fill?: string }> = ({ fill = C.cloud }) => (
  <>
    <Circle cx={11} cy={20} r={5} fill={fill} />
    <Circle cx={17} cy={17} r={6.5} fill={fill} />
    <Circle cx={23} cy={20} r={4.5} fill={fill} />
    <Rect x={10} y={19} width={14} height={6} rx={3} fill={fill} />
  </>
);

const Rain: React.FC = () => (
  <G stroke={C.rain} strokeWidth={1.8} strokeLinecap="round">
    {[11, 16, 21].map(x => (
      <Line key={x} x1={x} y1={26} x2={x - 1.5} y2={30} />
    ))}
  </G>
);

const Snow: React.FC = () => (
  <G fill={C.snow}>
    {[11, 16, 21].map(x => (
      <Circle key={x} cx={x} cy={28} r={1.3} />
    ))}
  </G>
);

const Bolt: React.FC = () => (
  <Path d="M16 23 l-3 5 h2.5 l-1.5 4 4.5 -6 h-2.5 l2 -3 z" fill={C.bolt} />
);

const Fog: React.FC = () => (
  <G stroke={C.fog} strokeWidth={2.2} strokeLinecap="round">
    <Line x1={8} y1={12} x2={24} y2={12} />
    <Line x1={6} y1={17} x2={26} y2={17} />
    <Line x1={9} y1={22} x2={23} y2={22} />
  </G>
);

function renderGlyph(code: string): React.ReactNode {
  const group = code.slice(0, 2);
  const night = code.endsWith('n');
  switch (group) {
    case '01':
      return night ? <Moon /> : <Sun />;
    case '02':
      return (
        <>
          {night ? <Moon /> : <Sun cx={12} cy={11} r={4.5} />}
          <Cloud />
        </>
      );
    case '03':
      return <Cloud />;
    case '04':
      return <Cloud fill={C.cloudDark} />;
    case '09':
      return (
        <>
          <Cloud />
          <Rain />
        </>
      );
    case '10':
      return (
        <>
          {!night && <Sun cx={12} cy={10} r={4} />}
          <Cloud />
          <Rain />
        </>
      );
    case '11':
      return (
        <>
          <Cloud fill={C.cloudDark} />
          <Bolt />
        </>
      );
    case '13':
      return (
        <>
          <Cloud />
          <Snow />
        </>
      );
    case '50':
      return <Fog />;
    default:
      return <Cloud />;
  }
}

export const WeatherIcon: React.FC<Props> = ({ code = '01d', size = 32 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    accessible
    accessibilityLabel="current weather icon"
  >
    {renderGlyph(code)}
  </Svg>
);
