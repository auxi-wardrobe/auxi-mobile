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
import { BottomSheetSurface, TopIconButton } from '../components/primitives/FigmaPrimitives';
import { theme } from '../theme/theme';
import { wardrobeService, WardrobeItem } from '../services/wardrobeService';
import { AppStackParamList } from '../types/navigation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const GRID_GAP = 8;
const TILE_SIZE = Math.floor((screenWidth - 44 - GRID_GAP * 2) / 3);

type Navigation = NativeStackNavigationProp<AppStackParamList, 'Wardrobe'>;

export const WardrobeScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [items, setItems] = useState<WardrobeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const data = await wardrobeService.getWardrobeItems();
      setItems(data);
    } catch (error) {
      console.error('Error fetching wardrobe items', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

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
          await wardrobeService.uploadWardrobeItem(result.assets[0]);
          await fetchItems();
        } catch (error) {
          console.error('Upload error', error);
          Alert.alert('Error', 'Failed to upload item');
        } finally {
          setUploading(false);
        }
      }
    }, 350);
  };

  const displayItems = useMemo(() => items.slice(0, 23), [items]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topOverlay}>
        <View style={styles.topBar}>
          <TopIconButton
            onPress={() => navigation.goBack()}
            icon={<Text style={styles.backGlyph}>‹</Text>}
          />
          <Text style={styles.headerTitle}>Wardrobe</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            disabled={uploading}
            style={styles.topAddButton}
            activeOpacity={0.85}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={theme.colors.figmaAction} />
            ) : (
              <Text style={styles.plusGlyph}>+</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheetSurface style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <TopIconButton
            onPress={() => navigation.goBack()}
            icon={<Text style={styles.backGlyph}>‹</Text>}
            style={styles.sheetBackButton}
          />

          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            disabled={uploading}
            style={styles.addRow}
            activeOpacity={0.85}
          >
            <Text style={styles.addText}>Add</Text>
            <Text style={styles.addPlus}>+</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={theme.colors.figmaAction} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.gridContent}>
            <View style={styles.grid}>
              <TouchableOpacity
                style={styles.cameraTile}
                activeOpacity={0.86}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.cameraGlyph}>◉</Text>
              </TouchableOpacity>

              {displayItems.map((item) => (
                <View key={item.id} style={styles.tile}>
                  <Image source={{ uri: item.image_url }} style={styles.tileImage} resizeMode="cover" />
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </BottomSheetSurface>

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
                <Text style={styles.modalTitle}>Add New Item</Text>

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
    backgroundColor: '#B9B9BD',
  },
  topOverlay: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 22,
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backGlyph: {
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 34,
    marginTop: -2,
  },
  headerTitle: {
    ...theme.typography.aliases.archivoBody,
    color: theme.colors.figmaAction,
    fontSize: 34,
    lineHeight: 40,
    fontFamily: 'PlayfairDisplay-Medium',
  },
  topAddButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusGlyph: {
    fontSize: 38,
    lineHeight: 38,
    color: theme.colors.figmaAction,
    marginTop: -4,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: screenHeight * 0.64,
    maxHeight: screenHeight * 0.72,
  },
  sheetHeader: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetBackButton: {
    backgroundColor: '#F4F4F6',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addText: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
  },
  addPlus: {
    ...theme.typography.aliases.archivoButton,
    color: theme.colors.figmaAction,
    fontSize: 26,
    lineHeight: 26,
    marginTop: -2,
  },
  centered: {
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContent: {
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  cameraTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CACAD2',
    borderStyle: 'dashed',
    backgroundColor: '#F7F7F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraGlyph: {
    color: '#151515',
    fontSize: 22,
    lineHeight: 22,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#EEEFF3',
  },
  tileImage: {
    width: '100%',
    height: '100%',
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
