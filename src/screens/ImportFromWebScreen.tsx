import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import RNWebView, {
  WebViewMessageEvent,
  WebViewProps,
} from 'react-native-webview';

import { Header } from '../components/layout/Header';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { PressableScale } from '../components/primitives/PressableScale';
import { MButton, toast } from '../components/design-system/lib';
import { DotsLoader } from '../components/atoms/DotsLoader';
import { Icons } from '../assets/icons';
import { theme } from '../theme/theme';
import { useAuth } from '../context/AuthContext';
import { wardrobeService } from '../services/wardrobeService';
import { track } from '../services/analytics';
import { AppStackParamList } from '../types/navigation';
import {
  ExtractedImage,
  buildExtractionScript,
  buildSearchUrl,
  isValidQuery,
  parseExtractionMessage,
} from './wardrobe/import-from-web';
import { ImportSelectImageSheet } from './wardrobe/ImportSelectImageSheet';
import { ImportPreviewModal } from './wardrobe/ImportPreviewModal';

type ScreenNavigation = NativeStackNavigationProp<
  AppStackParamList,
  'ImportFromWeb'
>;

// react-native-webview@14's class type (`WebView<P = undefined>`) intersects
// its props with `undefined`, which collapses to `never` under @types/react 19,
// so JSX usage errors on every prop. Cast to a plain props-typed component; the
// ref keeps the class instance type for injectJavaScript()/reload().
const WebView = RNWebView as unknown as React.ForwardRefExoticComponent<
  WebViewProps & React.RefAttributes<RNWebView>
>;

// If the injected scraper never posts back (page blocked it, navigated mid-run),
// give up after this long so the CTA re-enables instead of hanging forever.
const EXTRACT_TIMEOUT_MS = 10000;

const HOW_TO_STEPS = [
  'wardrobe.import_web.how_to_step1',
  'wardrobe.import_web.how_to_step2',
  'wardrobe.import_web.how_to_step3',
  'wardrobe.import_web.how_to_step4',
];

/**
 * Import from web (Figma: Import from web flow). One screen driving the whole
 * state machine: query input → embedded Google results (WebView) → Extract
 * images (injected scraper) → Select an image sheet → Preview → Import. The new
 * item is created straight from the picked image URL and rides the existing
 * preparing→ready lifecycle; on success we pop back to Wardrobe with a
 * `justImported` intent so it shows the "item added" snackbar + refetches.
 */
export const ImportFromWebScreen = () => {
  const navigation = useNavigation<ScreenNavigation>();
  const { t } = useTranslation();
  const { user } = useAuth();

  const webViewRef = useRef<RNWebView>(null);
  const mountedRef = useRef(true);
  const extractTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  // null until the first search — the input/instructions view shows while null,
  // the embedded results + Extract CTA show once a URL is set.
  const [searchUrl, setSearchUrl] = useState<string | null>(null);
  const [webLoading, setWebLoading] = useState(false);
  const [webError, setWebError] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [images, setImages] = useState<ExtractedImage[]>([]);
  const [selectSheetVisible, setSelectSheetVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState<ExtractedImage | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const clearExtractTimer = useCallback(() => {
    if (extractTimerRef.current) {
      clearTimeout(extractTimerRef.current);
      extractTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      mountedRef.current = false;
      clearExtractTimer();
    },
    [clearExtractTimer],
  );

  const queryValid = isValidQuery(query);

  const handleSubmitSearch = useCallback(() => {
    if (!queryValid) {
      return;
    }
    setWebError(false);
    setWebLoading(true);
    setSearchUrl(buildSearchUrl(query));
  }, [query, queryValid]);

  const handleReloadResults = useCallback(() => {
    setWebError(false);
    setWebLoading(true);
    webViewRef.current?.reload();
  }, []);

  const handleExtract = useCallback(() => {
    // High-risk: block re-taps while the page is loading or an extraction is
    // already in flight so we never stack scrapers or race the result.
    if (extracting || webLoading || webError) {
      return;
    }
    setExtracting(true);
    webViewRef.current?.injectJavaScript(buildExtractionScript());
    clearExtractTimer();
    extractTimerRef.current = setTimeout(() => {
      if (!mountedRef.current) {
        return;
      }
      setExtracting(false);
      toast.show({
        type: 'error',
        text1: t('wardrobe.import_web.extract_failed'),
        position: 'bottom',
      });
    }, EXTRACT_TIMEOUT_MS);
  }, [extracting, webLoading, webError, clearExtractTimer, t]);

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent) => {
      clearExtractTimer();
      if (!mountedRef.current) {
        return;
      }
      setExtracting(false);

      const result = parseExtractionMessage(event.nativeEvent.data);
      if (!result) {
        toast.show({
          type: 'error',
          text1: t('wardrobe.import_web.extract_failed'),
          position: 'bottom',
        });
        return;
      }

      if (result.images.length === 0) {
        toast.show({
          type: 'info',
          text1:
            result.total === 0
              ? t('wardrobe.import_web.empty_no_images')
              : t('wardrobe.import_web.empty_unsupported'),
          position: 'bottom',
        });
        return;
      }

      setImages(result.images);
      // Only one eligible image → skip the picker and go straight to preview.
      if (result.images.length === 1) {
        setImportError(null);
        setPreviewImage(result.images[0]);
      } else {
        setSelectSheetVisible(true);
      }
    },
    [clearExtractTimer, t],
  );

  const handleSelectImage = useCallback((image: ExtractedImage) => {
    setSelectSheetVisible(false);
    setImportError(null);
    setPreviewImage(image);
  }, []);

  const handlePreviewCancel = useCallback(() => {
    if (importing) {
      return;
    }
    setPreviewImage(null);
    setImportError(null);
    // Multiple candidates → return to the selection grid; a lone auto-selected
    // image has no grid to return to, so we drop back to the results page.
    if (images.length > 1) {
      setSelectSheetVisible(true);
    }
  }, [importing, images.length]);

  const handleImport = useCallback(async () => {
    if (importing || !previewImage || !user) {
      return;
    }
    setImporting(true);
    setImportError(null);
    track('wardrobe_url_import_submitted', { image_url: previewImage.url });

    try {
      const created = await wardrobeService.importWardrobeItemFromUrl(
        previewImage.url,
        user,
      );
      if (!mountedRef.current) {
        return;
      }
      const props: Record<string, unknown> = { method: 'import_web' };
      if (created?.id) {
        props.item_id = created.id;
      }
      if (created?.category) {
        props.category = created.category;
      }
      track('wardrobe_url_import_completed', props);
      track('wardrobe_item_added', props);
      // Pop back to Wardrobe; the param triggers the "item added" snackbar +
      // a refetch that surfaces the preparing placeholder tile.
      navigation.navigate('Wardrobe', { justImported: true });
    } catch (error) {
      console.error('Import from web failed', error);
      if (!mountedRef.current) {
        return;
      }
      track('wardrobe_url_import_failed', {});
      // Keep the preview open and re-enable Import; show the reason inline
      // (a toast would hide behind the preview Modal).
      setImporting(false);
      setImportError(t('wardrobe.import_web.import_failed'));
    }
  }, [importing, previewImage, user, navigation, t]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header.BackTitle
        title={t('wardrobe.import_web.title')}
        leftTestID="import-web-back"
        leftAccessibilityLabel={t('uac.common.back')}
        onBack={() => navigation.goBack()}
      />

      {searchUrl === null ? (
        // ── Input + instructions ────────────────────────────────────────────
        <ScrollView
          style={styles.inputScroll}
          contentContainerStyle={styles.inputContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.searchRow}>
            <View style={styles.searchField}>
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={t('wardrobe.import_web.search_placeholder')}
                placeholderTextColor={theme.colors.figmaTextSecondary}
                returnKeyType="search"
                onSubmitEditing={handleSubmitSearch}
                autoFocus
                autoCorrect={false}
                testID="import-web-search-input"
                accessibilityLabel={t('wardrobe.import_web.search_a11y')}
              />
            </View>
            <PressableScale
              style={[
                styles.submitButton,
                !queryValid && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmitSearch}
              disabled={!queryValid}
              activeOpacity={0.85}
              testID="import-web-search-submit"
              accessibilityLabel={t('wardrobe.import_web.submit_a11y')}
            >
              <Icons.ArrowRight
                width={20}
                height={20}
                color={theme.colors.white}
              />
            </PressableScale>
          </View>

          <Text style={styles.howToTitle}>
            {t('wardrobe.import_web.how_to_title')}
          </Text>
          {HOW_TO_STEPS.map((stepKey, index) => (
            <View key={stepKey} style={styles.howToRow}>
              <Text style={styles.howToNumber}>{index + 1}.</Text>
              <Text style={styles.howToText}>{t(stepKey)}</Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        // ── Embedded results + Extract CTA ──────────────────────────────────
        <View style={styles.browserWrap}>
          {webError ? (
            <View style={styles.stateOverlay} testID="import-web-error-state">
              <Text style={styles.stateTitle}>
                {t('wardrobe.import_web.results_error_title')}
              </Text>
              <Text style={styles.stateBody}>
                {t('wardrobe.import_web.results_error_body')}
              </Text>
              <View style={styles.stateRetryWrap}>
                <MButton
                  variant="secondary"
                  onPress={handleReloadResults}
                  testID="import-web-error-retry"
                  accessibilityLabel={t('common.retry')}
                >
                  {t('common.retry')}
                </MButton>
              </View>
            </View>
          ) : (
            <>
              <WebView
                ref={webViewRef}
                source={{ uri: searchUrl }}
                originWhitelist={['https://*', 'http://*']}
                onMessage={handleWebViewMessage}
                onLoadStart={() => setWebLoading(true)}
                onLoadEnd={() => setWebLoading(false)}
                onError={() => {
                  setWebLoading(false);
                  setWebError(true);
                }}
                onHttpError={() => {
                  setWebLoading(false);
                  setWebError(true);
                }}
                style={styles.webView}
                testID="import-web-webview"
              />

              {webLoading || extracting ? (
                <View
                  style={styles.webLoadingOverlay}
                  pointerEvents={extracting ? 'auto' : 'none'}
                  testID="import-web-loading"
                >
                  <DotsLoader color={theme.colors.figmaAction} />
                  {extracting ? (
                    <Text style={styles.extractingText}>
                      {t('wardrobe.import_web.extracting')}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.extractBar} pointerEvents="box-none">
                <PillButton
                  variant="filled"
                  title={t('wardrobe.import_web.extract_cta')}
                  onPress={handleExtract}
                  disabled={extracting || webLoading}
                  style={styles.extractButton}
                  testID="import-web-extract"
                  accessibilityLabel={t('wardrobe.import_web.extract_cta')}
                />
              </View>
            </>
          )}
        </View>
      )}

      <ImportSelectImageSheet
        visible={selectSheetVisible}
        images={images}
        onSelect={handleSelectImage}
        onCancel={() => setSelectSheetVisible(false)}
      />

      <ImportPreviewModal
        visible={previewImage !== null}
        imageUrl={previewImage?.url ?? null}
        importing={importing}
        errorMessage={importError}
        onCancel={handlePreviewCancel}
        onImport={handleImport}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  inputScroll: {
    flex: 1,
  },
  inputContent: {
    paddingHorizontal: theme.spacing.l,
    paddingTop: theme.spacing.l,
    paddingBottom: theme.spacing.xl,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
  },
  searchField: {
    flex: 1,
    height: 48,
    borderRadius: theme.borderRadius.m,
    borderWidth: 1,
    borderColor: theme.colors.figmaListDivider,
    backgroundColor: theme.colors.figmaBackground,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  searchInput: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextPrimary,
    padding: 0,
  },
  submitButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.m,
    backgroundColor: theme.colors.figmaAction,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  howToTitle: {
    ...theme.typography.aliases.interSemiboldXsSm,
    color: theme.colors.figmaTextPrimary,
    marginTop: theme.spacing.l,
    marginBottom: theme.spacing.m,
  },
  howToRow: {
    flexDirection: 'row',
    marginBottom: theme.spacing.s,
  },
  howToNumber: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    width: 20,
  },
  howToText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    flex: 1,
  },
  browserWrap: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  webLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    gap: theme.spacing.s,
  },
  extractingText: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
  },
  extractBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: theme.spacing.l,
    paddingHorizontal: theme.spacing.l,
  },
  extractButton: {
    alignSelf: 'stretch',
  },
  stateOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.l,
  },
  stateTitle: {
    ...theme.typography.aliases.interSemiboldSm,
    color: theme.colors.figmaTextPrimary,
    textAlign: 'center',
  },
  stateBody: {
    ...theme.typography.aliases.interBodySm,
    color: theme.colors.figmaTextSecondary,
    textAlign: 'center',
    marginTop: theme.spacing.s,
    maxWidth: 280,
  },
  stateRetryWrap: {
    marginTop: theme.spacing.l,
  },
});
