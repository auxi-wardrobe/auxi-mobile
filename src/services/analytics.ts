// Telemetry shim. Real SDK (mixpanel-react-native) lands later; this file
// is the single seam — when the SDK installs, replace the body of `track`
// with the real Mixpanel call. Call sites stay unchanged.

type TrackProps = Record<string, unknown>;

export const track = (event: string, props: TrackProps = {}): void => {
  // In dev, surface events to Metro console for verification on simulator.
  // In release, this is a no-op. When the SDK lands, swap the body.
  if (__DEV__) {
    console.info('analytics.track', event, props);
  }
};
