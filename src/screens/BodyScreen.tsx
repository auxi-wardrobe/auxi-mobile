import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PillButton, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { bodyService, BodyItem } from '../services/bodyService';
import { getImageUrl } from '../utils/url';
import { AppStackParamList } from '../types/navigation';

const { width: screenWidth } = Dimensions.get('window');
const IMAGE_GAP = 8;
const IMAGE_SIZE = Math.floor((screenWidth - 44 - IMAGE_GAP * 2) / 3);

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Body'>;

export const BodyScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<BodyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await bodyService.getBodies();
      setItems(data);
    } catch (error) {
      console.error('Error fetching body items', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleDelete = (id: string) => {
    Alert.alert('Delete body photo?', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await bodyService.deleteBody(id);
            await fetchItems();
          } catch (error) {
            console.error('Error deleting body', error);
            Alert.alert('Error', 'Failed to delete body');
            setLoading(false);
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

      const result = type === 'camera' ? await launchCamera(options) : await launchImageLibrary(options);

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      if (result.assets?.length) {
        try {
          setUploading(true);
          await bodyService.uploadBody(result.assets[0]);
          await fetchItems();
        } catch (error) {
          console.error('Upload error', error);
          Alert.alert('Error', 'Failed to upload body');
        } finally {
          setUploading(false);
        }
      }
    }, 350);
  };

  const previewItems = useMemo(() => items.slice(0, 3), [items]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TopIconButton
          onPress={() => navigation.goBack()}
          icon={<Text style={styles.backGlyph}>‹</Text>}
        />
        <Text style={styles.title}>Option A</Text>
        <Text style={styles.dots}>•••</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          </View>
        ) : (
          <View style={styles.imageRow}>
            {previewItems.length > 0
              ? previewItems.map((item) => {
                  const imageUri = getImageUrl(item.image_url) || item.image_url;
                  return (
                    <TouchableOpacity key={item.id} onLongPress={() => handleDelete(item.id)} style={styles.imageCard}>
                      <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                })
              : [0, 1, 2].map((index) => <View key={index} style={[styles.imageCard, styles.placeholderCard]} />)}
          </View>
        )}

        <View style={styles.copyBlock}>
          <Text style={styles.copyLine}>White long-sleeve top</Text>
          <Text style={styles.copyLine}>Lightweight jacket</Text>
          <Text style={styles.copyLine}>Black straight-leg trousers</Text>
          <Text style={styles.copyLine}>Sneakers</Text>
        </View>

        <View style={styles.summaryBlock}>
          <Text style={styles.summaryTitle}>Summary</Text>
          <Text style={styles.summaryText}>
            Light layers keep you comfortable in cool weather, and neutral colors make this easy to wear and easy to match.
          </Text>
        </View>

        <Text style={styles.adjustText}>Or Do you want to adjust something?</Text>

        <View style={styles.generateWrap}>
          <PillButton title="Generate my look" variant="soft" style={styles.generateButton} />
        </View>

        <View style={styles.uploadHelp}>
          <Text style={styles.uploadHelpText}>To generate a realistic look, I need a clear photo of your full body.</Text>
          <Text style={styles.uploadHelpText}>This helps the outfit fit your proportions more accurately.</Text>
          <Text style={styles.uploadHelpText}>Click to upload</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomActionWrap}>
        <PillButton
          title="Upload my photo"
          variant="outline"
          onPress={() => setModalVisible(true)}
          loading={uploading}
        />
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

                <TouchableOpacity style={styles.modalAction} onPress={() => handleImageSelection('camera')}>
                  <Text style={styles.modalActionText}>Take a photo</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity style={styles.modalAction} onPress={() => handleImageSelection('gallery')}>
                  <Text style={styles.modalActionText}>Upload from gallery</Text>
                </TouchableOpacity>

                <View style={styles.modalDivider} />

                <TouchableOpacity style={styles.modalCancel} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  title: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  dots: {
    color: '#C0C0C0',
    fontSize: 28,
    lineHeight: 32,
    width: 45,
    textAlign: 'right',
    marginTop: -4,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 110,
    paddingBottom: 170,
  },
  centered: {
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageRow: {
    flexDirection: 'row',
    gap: IMAGE_GAP,
  },
  imageCard: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: theme.colors.figmaSurface,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  placeholderCard: {
    backgroundColor: '#E5E6EA',
  },
  copyBlock: {
    marginTop: 18,
    gap: 2,
  },
  copyLine: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  summaryBlock: {
    marginTop: 22,
    gap: 4,
  },
  summaryTitle: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaText,
  },
  summaryText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
  },
  adjustText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
    marginTop: 22,
  },
  generateWrap: {
    alignItems: 'flex-end',
    marginTop: 18,
  },
  generateButton: {
    borderWidth: 0,
    backgroundColor: '#D6D6E0',
    paddingHorizontal: 18,
    height: 48,
  },
  uploadHelp: {
    marginTop: 22,
    gap: 2,
  },
  uploadHelpText: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaText,
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
    backgroundColor: '#FFFFFF',
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
});
