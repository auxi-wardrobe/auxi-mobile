/**
 * Web stub for react-native-webview — keeps the "Import from web" flow
 * demoable in the sandbox (Cloudflare web preview).
 *
 * The real extraction can't work in a browser: the results page renders in a
 * cross-origin <iframe> we can't inject into (and Google refuses framing
 * anyway). So this stub:
 *   - renders the target URL in an iframe (layout/chrome stays faithful; the
 *     frame body may show "refused to connect" — expected),
 *   - resolves `injectJavaScript()` with a canned extraction payload of
 *     placeholder photos after a short delay, so designers can click through
 *     Extract → Select an image → Preview → Import end-to-end.
 *
 * On-device behaviour is unchanged — this file is only aliased in by
 * vite.config.ts for the web build.
 */
import React from 'react';

export interface WebViewMessageEvent {
  nativeEvent: { data: string };
}

// Loose on purpose — the stub only touches the props it simulates.
export type WebViewProps = {
  source?: { uri?: string };
  onMessage?: (event: WebViewMessageEvent) => void;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
  onHttpError?: () => void;
  style?: unknown;
  testID?: string;
  [key: string]: unknown;
};

// DOM styles (div/iframe are DOM nodes, not RN views — StyleSheet doesn't
// apply). Hoisted so react-native/no-inline-styles stays quiet.
const frameWrapStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
};
const frameStyle: React.CSSProperties = {
  flex: 1,
  border: 'none',
  width: '100%',
};

const MOCK_EXTRACTION = {
  type: 'extract',
  total: 6,
  images: Array.from({ length: 6 }, (_, i) => ({
    url: `https://picsum.photos/seed/auxi-import-${i}/600/800`,
    width: 600,
    height: 800,
  })),
};

export class WebView extends React.Component<WebViewProps> {
  private timers: ReturnType<typeof setTimeout>[] = [];

  componentDidMount() {
    this.props.onLoadStart?.();
    // Blocked cross-origin frames don't reliably fire onLoad — settle via timer.
    this.timers.push(setTimeout(() => this.props.onLoadEnd?.(), 1200));
  }

  componentWillUnmount() {
    this.timers.forEach(clearTimeout);
  }

  reload() {
    this.props.onLoadStart?.();
    this.timers.push(setTimeout(() => this.props.onLoadEnd?.(), 1200));
  }

  injectJavaScript(_script: string) {
    // Simulate the scraper posting back (see import-from-web.ts payload shape).
    this.timers.push(
      setTimeout(() => {
        this.props.onMessage?.({
          nativeEvent: { data: JSON.stringify(MOCK_EXTRACTION) },
        });
      }, 800),
    );
  }

  render() {
    const uri = this.props.source?.uri ?? 'about:blank';
    return (
      <div style={frameWrapStyle} data-testid={this.props.testID}>
        <iframe title="import-web-results" src={uri} style={frameStyle} />
      </div>
    );
  }
}

export default WebView;
