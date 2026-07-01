import React from 'react';
import {
  Image,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

interface BodyImageLightboxProps {
  visible: boolean;
  imageUrl: string | null;
  onClose: () => void;
}

// Full-screen tap-to-dismiss image lightbox.
// Raw Modal kept intentionally — DS migration is a separate gated pass.
export const BodyImageLightbox: React.FC<BodyImageLightboxProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.largeImageModalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.largeImageContainer}>
              {imageUrl && (
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.largeImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
