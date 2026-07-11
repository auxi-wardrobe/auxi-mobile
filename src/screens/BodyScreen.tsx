import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { toast } from '../components/design-system/lib';
import { useTranslation } from 'react-i18next';
import { PillButton } from '../components/primitives/FigmaPrimitives';
import { useAuth } from '../context/AuthContext';
import { bodyService, BodyItem } from '../services/bodyService';
import { tryOnService } from '../services/tryOnService';
import { pollJob } from '../services/job-polling';
import { track } from '../services/analytics';
import { useAiConsentGate } from '../hooks/useAiConsentGate';
import { AiConsentDialog } from '../components/features/AiConsentDialog';
import { theme } from '../theme/theme';
import { AppStackParamList, TryOnOutfitContext } from '../types/navigation';
import { getErrorStatus, resolveImageUrl } from '../utils/body';
import { Header } from '../components/layout/Header';
import { PhotoSourceModal } from './body/PhotoSourceModal';
import { BodyImageLightbox } from './body/BodyImageLightbox';
import { BodyPhotoDetailView } from './body/BodyPhotoDetailView';
import { BodyGalleryView } from './body/BodyGalleryView';
import { BodyTryOnView } from './body/BodyTryOnView';
import { BodyManageView } from './body/BodyManageView';

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Body'>;
type ScreenRoute = RouteProp<AppStackParamList, 'Body'>;

// Modes the Body route can resolve to. `manage` is the default (undefined params).
type BodyMode = 'manage' | 'gallery' | 'tryOn' | 'photoDetail';

// Exhaustiveness guard for the discriminated Body route union. A `never` arg
// means every mode is handled; a new mode added later forces a compile error here.
const assertNever = (value: never): never => {
  throw new Error(`Unhandled Body mode: ${String(value)}`);
};

export const BodyScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const { checkAuth } = useAuth();
  const { t } = useTranslation();
  // B1: gate the AI photo upload behind explicit, persisted consent.
  const aiConsentGate = useAiConsentGate();

  // Derive mode once + narrow the discriminated union. The union guarantees
  // `outfit` is present when mode === 'tryOn' and `bodyId` only on 'photoDetail',
  // so no non-null assertions are needed below.
  const params = route.params;
  const mode: BodyMode = params?.mode ?? 'manage';
  let tryOnOutfit: TryOnOutfitContext | null = null;
  let detailBodyId: string | undefined;
  switch (mode) {
    case 'tryOn':
      // params is narrowed to { mode: 'tryOn'; outfit } here.
      tryOnOutfit = params && params.mode === 'tryOn' ? params.outfit : null;
      break;
    case 'photoDetail':
      detailBodyId =
        params && params.mode === 'photoDetail' ? params.bodyId : undefined;
      break;
    case 'gallery':
      break;
    case 'manage':
      break;
    default:
      assertNever(mode);
  }
  const isTryOnMode = mode === 'tryOn' && !!tryOnOutfit;
  const isPhotoDetailMode = mode === 'photoDetail';
  const isGalleryMode = mode === 'gallery';

  const [items, setItems] = useState<BodyItem[]>([]);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTryOnUrl, setGeneratedTryOnUrl] = useState<string | null>(
    null,
  );
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [largeImageModalVisible, setLargeImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchItems = useCallback(
    async (preferredId?: string) => {
      try {
        setLoading(true);
        const data = await bodyService.getBodies();
        setItems(data);
        setSelectedBodyId(currentSelected => {
          if (preferredId && data.some(item => item.id === preferredId)) {
            return preferredId;
          }

          if (
            currentSelected &&
            data.some(item => item.id === currentSelected)
          ) {
            return currentSelected;
          }

          return data[0]?.id || null;
        });
      } catch (error) {
        console.error('Error fetching body items', error);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        } else if (isPhotoDetailMode) {
          // photoDetail must not silently fall through to the "no photo yet"
          // placeholder on a fetch failure — surface it (other modes keep the
          // existing grid placeholder behavior).
          toast.show({
            type: 'error',
            text1: t('body.toast_load_failed_title'),
            text2: t('body.toast_load_failed_body'),
            position: 'bottom',
            visibilityTime: 4000,
          });
        }
      } finally {
        setLoading(false);
      }
    },
    [checkAuth, isPhotoDetailMode, t],
  );

  useEffect(() => {
    // In photoDetail mode, prefer the explicitly-passed bodyId; otherwise
    // fetchItems falls back to current/first selected body (preserves behavior
    // when bodyId is absent).
    fetchItems(detailBodyId);
  }, [fetchItems, detailBodyId]);

  // Gallery mode pushes a photoDetail screen on top; deleting a photo there
  // pops back here. Refetch on RE-focus so the removed tile disappears from the
  // grid. The mount effect above owns the initial load — skip the first focus
  // so we don't double-fetch on entry.
  const galleryFirstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (!isGalleryMode) {
        return;
      }
      if (galleryFirstFocusRef.current) {
        galleryFirstFocusRef.current = false;
        return;
      }
      fetchItems();
    }, [isGalleryMode, fetchItems]),
  );

  const selectedBody = useMemo(
    () => items.find(item => item.id === selectedBodyId) || null,
    [items, selectedBodyId],
  );

  const previewImageUrl = generatedTryOnUrl
    ? resolveImageUrl(generatedTryOnUrl)
    : selectedBody
    ? resolveImageUrl(selectedBody.image_url)
    : null;

  const handleDelete = (id: string) => {
    Alert.alert(t('body.delete_title'), t('common.action_cannot_undo'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            if (selectedBodyId === id) {
              setGeneratedTryOnUrl(null);
            }

            await bodyService.deleteBody(id);
            track('body_photo_deleted', { slot: 'full_body' });

            // photoDetail shows a single photo — after deleting it there's
            // nothing left to show, so return rather than strand the user on
            // an empty detail screen.
            if (isPhotoDetailMode) {
              navigation.goBack();
              return;
            }

            const fallbackId =
              selectedBodyId === id ? undefined : selectedBodyId || undefined;
            await fetchItems(fallbackId);
          } catch (error) {
            console.error('Error deleting body', error);
            if (getErrorStatus(error) === 401) {
              await checkAuth();
            } else {
              Alert.alert(t('common.error_title'), t('body.delete_failed'));
            }
          }
        },
      },
    ]);
  };

  const handleImageSelection = async (type: 'camera' | 'gallery') => {
    setModalVisible(false);

    setTimeout(async () => {
      const options = {
        mediaType: 'photo' as const,
        selectionLimit: 1,
      };

      const result =
        type === 'camera'
          ? await launchCamera(options)
          : await launchImageLibrary(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert(
          t('common.error_title'),
          result.errorMessage || t('common.pick_image_failed'),
        );
        return;
      }

      if (!result.assets?.length) {
        return;
      }

      // Snapshot before the upload so we can classify add-vs-replace.
      // §3.7 #53/#54: first photo set in slot vs replacement. BodyScreen
      // manages the full_body reference slot — selfie/body_shape live on the
      // STOM capture flow.
      const wasEmpty = items.length === 0;
      const isRetake = isPhotoDetailMode;
      try {
        setUploading(true);
        const uploadedItem = await bodyService.uploadBody(result.assets[0]);
        track(
          wasEmpty && !isRetake ? 'body_photo_added' : 'body_photo_replaced',
          { slot: 'full_body' },
        );
        setGeneratedTryOnUrl(null);
        setTryOnError(null);
        await fetchItems(uploadedItem.id);
      } catch (error) {
        console.error('Upload error', error);
        if (getErrorStatus(error) === 401) {
          await checkAuth();
        } else {
          Alert.alert(t('common.error_title'), t('body.upload_failed'));
        }
      } finally {
        setUploading(false);
      }
    }, 350);
  };

  // B1: tap → ensure AI data-sharing consent, THEN upload. The actual upload
  // only ever runs after consent, so it always sends gemini_opt_in: true (the
  // wire value now reflects a real, recorded decision — never a faked flag).
  const handleGenerateTryOn = () => {
    if (!tryOnOutfit || !selectedBodyId || isGenerating) {
      return;
    }
    aiConsentGate.run(runGenerateTryOn);
  };

  const runGenerateTryOn = async () => {
    if (!tryOnOutfit || !selectedBodyId || isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);
      setTryOnError(null);
      track('try_on_started', {
        outfit_hash: tryOnOutfit.outfitHash,
        item_count: tryOnOutfit.itemIds.length,
        has_body_photo: !!selectedBodyId,
      });
      // AU-358: the render is async now — submit enqueues a job, then we poll
      // for the durable S3 composite URL (worker does Kling → OpenAI fallback).
      const { job_id } = await tryOnService.generateTryOn({
        body_id: selectedBodyId,
        wardrobe_item_ids: tryOnOutfit.itemIds,
        gemini_opt_in: true,
      });
      const { result } = await pollJob(
        () => tryOnService.getTryOnResult(job_id),
        r => r.status === 'completed' || r.status === 'failed',
      );
      if (result?.status === 'completed' && result.composite_url) {
        setGeneratedTryOnUrl(result.composite_url);
        track('try_on_completed', { outfit_hash: tryOnOutfit.outfitHash });
      } else {
        // failed status, timeout, or no URL → surface the same error path.
        track('try_on_failed', { outfit_hash: tryOnOutfit.outfitHash });
        setTryOnError(t('body.tryon_failed'));
      }
    } catch (error) {
      console.error('Try-on generation error', error);
      track('try_on_failed', { outfit_hash: tryOnOutfit.outfitHash });
      setTryOnError(t('body.tryon_failed'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Try-on: tapping a body photo selects it as the render base.
  const handleSelectBody = (item: BodyItem) => {
    setSelectedBodyId(item.id);
    setGeneratedTryOnUrl(null);
    setTryOnError(null);
  };

  // Manage: tapping a body photo opens the full-screen lightbox.
  const handlePreviewImage = (imageUri: string) => {
    setSelectedImageUrl(imageUri);
    setLargeImageModalVisible(true);
  };

  // Manage body photo (Settings) — wardrobe-style grid of ALL the user's body
  // photos. Tapping a tile pushes a photoDetail screen (view + delete) on top,
  // so back returns here to the grid.
  if (isGalleryMode) {
    return (
      <BodyGalleryView
        loading={loading}
        items={items}
        uploading={uploading}
        modalVisible={modalVisible}
        onBack={() => navigation.goBack()}
        onTilePress={item =>
          navigation.push('Body', { mode: 'photoDetail', bodyId: item.id })
        }
        onAddPhoto={() => setModalVisible(true)}
        onImageSelect={handleImageSelection}
        onCloseSourceModal={() => setModalVisible(false)}
      />
    );
  }

  // Body-photo detail view (Settings redesign Frame 5) — same isPhotoDetailMode
  // condition, just moved to its own component (no routing change).
  if (isPhotoDetailMode) {
    return (
      <BodyPhotoDetailView
        selectedBody={selectedBody}
        loading={loading}
        uploading={uploading}
        modalVisible={modalVisible}
        onBack={() => navigation.goBack()}
        onDelete={handleDelete}
        onImageSelect={handleImageSelection}
        onOpenSourceModal={() => setModalVisible(true)}
        onCloseSourceModal={() => setModalVisible(false)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Header.BackTitle
        title={isTryOnMode ? t('body.tryon_tab') : t('body.mybody_tab')}
        leftTestID="body-back"
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {isTryOnMode && tryOnOutfit ? (
          <BodyTryOnView
            tryOnOutfit={tryOnOutfit}
            previewImageUrl={previewImageUrl}
            loading={loading}
            items={items}
            selectedBodyId={selectedBodyId}
            isTryOnMode={isTryOnMode}
            onSelectBody={handleSelectBody}
            onPreviewImage={handlePreviewImage}
            onDeleteItem={handleDelete}
            onUploadAnother={() => setModalVisible(true)}
            tryOnError={tryOnError}
          />
        ) : (
          <BodyManageView
            loading={loading}
            items={items}
            selectedBodyId={selectedBodyId}
            isTryOnMode={isTryOnMode}
            onSelectBody={handleSelectBody}
            onPreviewImage={handlePreviewImage}
            onDeleteItem={handleDelete}
          />
        )}
      </ScrollView>

      <View style={styles.bottomActionWrap}>
        {isTryOnMode ? (
          items.length === 0 ? (
            <PillButton
              title={t('body.upload_my_photo')}
              variant="outline"
              onPress={() => setModalVisible(true)}
              loading={uploading}
            />
          ) : (
            <PillButton
              title={
                generatedTryOnUrl
                  ? t('body.generate_again')
                  : t('body.generate_my_look')
              }
              variant="filled"
              onPress={handleGenerateTryOn}
              disabled={!selectedBodyId}
              loading={isGenerating}
            />
          )
        ) : (
          <PillButton
            title={t('body.upload_body_photo')}
            variant="outline"
            onPress={() => setModalVisible(true)}
            loading={uploading}
          />
        )}
      </View>

      <PhotoSourceModal
        visible={modalVisible}
        title={t('body.upload_body_photo')}
        onCamera={() => handleImageSelection('camera')}
        onGallery={() => handleImageSelection('gallery')}
        onClose={() => setModalVisible(false)}
      />

      <BodyImageLightbox
        visible={largeImageModalVisible}
        imageUrl={selectedImageUrl}
        onClose={() => setLargeImageModalVisible(false)}
      />

      {/* B1: AI data-sharing consent prompt — gates the try-on photo upload. */}
      <AiConsentDialog {...aiConsentGate.dialogProps} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 140,
    gap: 18,
  },
  bottomActionWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 28,
  },
});
