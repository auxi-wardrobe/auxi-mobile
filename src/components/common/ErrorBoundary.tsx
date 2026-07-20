import React, { type ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import { track } from '../../services/analytics';
import { Sentry } from '../../services/sentry';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Single fallback copy. The fallback renders when the React tree below it has
// thrown, so it stays dependency-light on purpose: no hooks (class component),
// no i18n lookup (a broken tree may include the i18n provider), just static
// English. ds tokens only.
const FALLBACK_TITLE = 'Something went wrong';
const FALLBACK_BODY =
  "We hit an unexpected error. You can try again — if it keeps happening, please restart the app.";
const FALLBACK_RETRY = 'Try again';

/**
 * Top-level React error boundary.
 *
 * Catches render/lifecycle errors anywhere in the wrapped subtree, reports the
 * error to Sentry, fires an `app_error_caught` analytics event (no PII — a
 * sanitized boolean flag only, never the raw message), and renders a
 * recoverable on-system fallback instead of a white screen / hard crash.
 *
 * "Try again" resets the boundary so the next render re-attempts the subtree
 * (recovers if the error was transient, e.g. a one-off data shape).
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Report to Sentry with the React component stack for triage. Sentry is
    // disabled in dev (see services/sentry.ts), so this is a no-op locally.
    Sentry.captureException(error, {
      contexts: {
        react: { componentStack: info.componentStack ?? undefined },
      },
    });
    // Analytics: presence-of-error signal only. No raw message / stack — those
    // can carry PII — per analytics-tracking-required.md.
    track('app_error_caught', { fatal: false });
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container} testID="app-error-boundary-fallback">
          <Text style={styles.title}>{FALLBACK_TITLE}</Text>
          <Text style={styles.body}>{FALLBACK_BODY}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={this.handleRetry}
            testID="app-error-boundary-retry"
            accessibilityRole="button"
            accessibilityLabel={FALLBACK_RETRY}
          >
            <Text style={styles.retryText}>{FALLBACK_RETRY}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.uacDimension24,
    backgroundColor: theme.colors.uacBackgroundBase,
  },
  title: {
    ...theme.typography.aliases.interBodyBold,
    color: theme.colors.uacTextPrimaryBase,
    textAlign: 'center',
    marginBottom: theme.spacing.uacDimension12,
  },
  body: {
    ...theme.typography.aliases.interBody,
    color: theme.colors.uacTextPrimaryBase,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  retryButton: {
    paddingHorizontal: theme.spacing.uacDimension24,
    paddingVertical: theme.spacing.uacDimension12,
    borderRadius: theme.borderRadius.figmaTile,
    backgroundColor: theme.colors.white,
  },
  retryText: {
    ...theme.typography.aliases.interButton,
    color: theme.colors.figmaTextDark,
  },
});
