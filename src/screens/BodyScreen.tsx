import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { bodyService, BodyItem } from '../services/bodyService';
import { tryOnService } from '../services/tryOnService';
import { theme } from '../theme/theme';
import { AppStackParamList } from '../types/navigation';
import { getImageUrl } from '../utils/url';
import { Icons } from '../assets/icons';

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_GAP = 8;
const IMAGE_SIZE = Math.floor((screenWidth - 44 - IMAGE_GAP * 2) / 3);

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Body'>;
type ScreenRoute = RouteProp<AppStackParamList, 'Body'>;

const resolveImageUrl = (url: string) => getImageUrl(url) || url;

export const BodyScreen = () => {
  const navigation = useNavigation<Navigation>();
  const route = useRoute<ScreenRoute>();
  const outfitContext = route.params?.outfit;
  const isTryOnMode = route.params?.mode === 'tryOn' && !!outfitContext;
  const tryOnOutfit = isTryOnMode ? outfitContext! : null;
  const [items, setItems] = useState<BodyItem[]>([]);
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTryOnUrl, setGeneratedTryOnUrl] = useState<string | null>(null);
  const [tryOnError, setTryOnError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [largeImageModalVisible, setLargeImageModalVisible] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fetchItems = useCallback(async (preferredId?: string) => {
    try {
      setLoading(true);
      const data = await bodyService.getBodies();
      setItems(data);
      setSelectedBodyId((currentSelected) => {
        if (preferredId && data.some((item) => item.id === preferredId)) {
          return preferredId;
        }

        if (currentSelected && data.some((item) => item.id === currentSelected)) {
          return currentSelected;
        }

        return data[0]?.id || null;
      });
    } catch (error) {
      console.error('Error fetching body items', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const selectedBody = useMemo(
    () => items.find((item) => item.id === selectedBodyId) || null,
    [items, selectedBodyId],
  );

  const previewImageUrl = generatedTryOnUrl
    ? resolveImageUrl(generatedTryOnUrl)
    : selectedBody
      ? resolveImageUrl(selectedBody.image_url)
      : null;

  const handleDelete = (id: string) => {
    Alert.alert('Delete body photo?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            if (selectedBodyId === id) {
              setGeneratedTryOnUrl(null);
            }

            await bodyService.deleteBody(id);
            const fallbackId = selectedBodyId === id ? undefined : selectedBodyId || undefined;
            await fetchItems(fallbackId);
          } catch (error) {
            console.error('Error deleting body', error);
            Alert.alert('Error', 'Failed to delete body');
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
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (!result.assets?.length) {
        return;
      }

      try {
        setUploading(true);
        const uploadedItem = await bodyService.uploadBody(result.assets[0]);
        setGeneratedTryOnUrl(null);
        setTryOnError(null);
        await fetchItems(uploadedItem.id);
      } catch (error) {
        console.error('Upload error', error);
        Alert.alert('Error', 'Failed to upload body');
      } finally {
        setUploading(false);
      }
    }, 350);
  };

  const handleGenerateTryOn = async () => {
    if (!tryOnOutfit || !selectedBodyId || isGenerating) {
      return;
    }

    try {
      setIsGenerating(true);
      setTryOnError(null);
      const response = await tryOnService.generateTryOn({
        outfit_hash: tryOnOutfit.outfitHash,
        item_ids: tryOnOutfit.itemIds,
        body_id: selectedBodyId,
      });
      setGeneratedTryOnUrl(response.image_url);
    } catch (error) {
      console.error('Try-on generation error', error);
      setTryOnError('Could not generate your try-on image. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderBodyGrid = () => {
    if (loading) {
      return (
        <View style={styles.imageRow}>
          {[0, 1, 2].map((index) => (
            <View key={`loading-${index}`} style={[styles.imageCard, styles.placeholderCard]} />
          ))}
        </View>
      );
    }

    if (items.length === 0) {
      return (
        <View style={styles.imageRow}>
          {[0, 1, 2].map((index) => (
            <View key={`placeholder-${index}`} style={[styles.imageCard, styles.placeholderCard]} />
          ))}
        </View>
      );
    }

    return (
      <View style={styles.imageRow}>
        {items.slice(0, 3).map((item) => {
          const imageUri = resolveImageUrl(item.image_url);
          const isSelected = item.id === selectedBodyId;

          return (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.88}
              onPress={() => {
                if (isTryOnMode) {
                  setSelectedBodyId(item.id);
                  setGeneratedTryOnUrl(null);
                  setTryOnError(null);
                } else {
                  setSelectedImageUrl(imageUri);
                  setLargeImageModalVisible(true);
                }
              }}
              onLongPress={() => handleDelete(item.id)}
              style={[
                styles.imageCard,
                isTryOnMode && isSelected && styles.imageCardSelected,
              ]}
            >
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TopIconButton
          onPress={() => navigation.goBack()}
          icon={<Icons.ChevronLeft width={20} height={20} />}
        />
        <Text style={styles.title}>{isTryOnMode ? 'Try on' : 'My body'}</Text>
        <View style={styles.topBarSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isTryOnMode && tryOnOutfit ? (
          <>
            <View style={styles.previewCard}>
              {previewImageUrl ? (
                <Image
                  source={{ uri: previewImageUrl }}
                  style={styles.tryOnPreview}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Text style={styles.previewPlaceholderText}>
                    Upload a full-body photo to generate your try-on image.
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.summaryBlock}>
              <Text style={styles.summaryTitle}>Selected outfit</Text>
              <View style={styles.outfitPreviewRow}>
                {tryOnOutfit.itemImageUrls.slice(0, 4).map((imageUrl, index) => (
                  <View key={`outfit-preview-${index}`} style={styles.outfitPreviewCard}>
                    <Image
                      source={{ uri: resolveImageUrl(imageUrl) }}
                      style={styles.outfitPreviewImage}
                      resizeMode="contain"
                    />
                  </View>
                ))}
              </View>
              {tryOnOutfit.stylingNote ? (
                <Text style={styles.summaryText}>{tryOnOutfit.stylingNote}</Text>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Choose a body photo</Text>
            {renderBodyGrid()}

            {items.length > 0 ? (
              <PillButton
                title="Upload another photo"
                variant="text"
                onPress={() => setModalVisible(true)}
                style={styles.inlineAction}
                textStyle={styles.inlineActionText}
              />
            ) : null}

            <Text style={styles.helperText}>
              {items.length === 0
                ? 'Use a clear, full-body photo so the try-on result can match your proportions.'
                : 'Tap a photo to use it for this look. Long press any photo to remove it.'}
            </Text>

            {tryOnError ? <Text style={styles.errorText}>{tryOnError}</Text> : null}
          </>
        ) : (
          <>
            <View style={styles.manageHero}>
              <Text style={styles.manageHeroTitle}>Body photos for try-on</Text>
              <Text style={styles.manageHeroText}>
                Upload clear, full-body photos once so future try-on results line up with
                your proportions.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Your body photos</Text>
            {renderBodyGrid()}

            {items.length > 0 ? (
              <Text style={styles.helperText}>
                Tap a photo to make it the default preview. Long press any photo to delete it.
              </Text>
            ) : (
              <Text style={styles.helperText}>
                No body photos yet. Upload your first one to unlock outfit try-on.
              </Text>
            )}
          </>
        )}
      </ScrollView>

      <View style={styles.bottomActionWrap}>
        {isTryOnMode ? (
          items.length === 0 ? (
            <PillButton
              title="Upload my photo"
              variant="outline"
              onPress={() => setModalVisible(true)}
              loading={uploading}
            />
          ) : (
            <PillButton
              title={generatedTryOnUrl ? 'Generate again' : 'Generate my look'}
              variant="filled"
              onPress={handleGenerateTryOn}
              disabled={!selectedBodyId}
              loading={isGenerating}
            />
          )
        ) : (
          <PillButton
            title="Upload body photo"
            variant="outline"
            onPress={() => setModalVisible(true)}
            loading={uploading}
          />
        )}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Upload body photo</Text>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => handleImageSelection('camera')}
                >
                  <Text style={styles.modalActionText}>Take a photo</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => handleImageSelection('gallery')}
                >
                  <Text style={styles.modalActionText}>Upload from gallery</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        animationType="fade"
        transparent
        visible={largeImageModalVisible}
        onRequestClose={() => setLargeImageModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setLargeImageModalVisible(false)}>
          <View style={styles.largeImageModalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.largeImageContainer}>
                {selectedImageUrl && (
                  <Image
                    source={{ uri: selectedImageUrl }}
                    style={styles.largeImage}
                    resizeMode="contain"
                  />
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.figmaBackground,
  },
  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.aliases.playfairDisplaySection,
    color: theme.colors.figmaAction,
  },
  topBarSpacer: {
    width: 45,
    height: 45,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 140,
    gap: 18,
  },
  previewCard: {
    minHeight: 320,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tryOnPreview: {
    width: '100%',
    height: 320,
  },
  previewPlaceholder: {
    minHeight: 320,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#E8EBF0',
  },
  previewPlaceholderText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaText,
    textAlign: 'center',
  },
  summaryBlock: {
    gap: 8,
  },
  summaryTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  summaryText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  outfitPreviewRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  outfitPreviewCard: {
    width: (screenWidth - 60) / 4,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#ECEEF2',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outfitPreviewImage: {
    width: '84%',
    height: '84%',
  },
  manageHero: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: theme.colors.white,
    gap: 8,
  },
  manageHeroTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  manageHeroText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  sectionTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  imageRow: {
    flexDirection: 'row',
    gap: IMAGE_GAP,
  },
  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.white,
  },
  imageCardSelected: {
    borderWidth: 2,
    borderColor: '#3BA3D0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCard: {
    backgroundColor: '#E5E6EA',
  },
  helperText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaTextSecondary,
  },
  errorText: {
    ...theme.typography.aliases.manropeCaption,
    color: theme.colors.figmaRed,
  },
  inlineAction: {
    alignSelf: 'flex-start',
    height: 36,
  },
  inlineActionText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
  },
  bottomActionWrap: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 28,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 34,
  },
  modalTitle: {
    ...theme.typography.aliases.manropeBody,
    textAlign: 'center',
    color: theme.colors.figmaAction,
    marginBottom: 16,
  },
  modalAction: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalActionText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaAction,
  },
  modalDivider: {
    height: 1,
    backgroundColor: theme.colors.figmaDivider,
  },
  modalCancel: {
    marginTop: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    ...theme.typography.aliases.manropeBody,
    color: theme.colors.figmaRed,
  },
  largeImageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeImageContainer: {
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  largeImage: {
    width: '100%',
    height: '100%',
  },
});
