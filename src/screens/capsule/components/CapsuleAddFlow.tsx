import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { trackCapsuleAddSourceSelected } from '../../../services/analytics';
import type { AppStackParamList } from '../../../types/navigation';
import { AddSourceSheet, type CapsuleAddSource } from './AddSourceSheet';

type Nav = NativeStackNavigationProp<AppStackParamList, 'CapsuleDetail'>;

interface CapsuleAddFlowProps {
  capsuleId: string;
  /** Controls the add-source sheet. */
  visible: boolean;
  onClose: () => void;
}

/**
 * Capsule "+" entry point: a source sheet, then a full PAGE to pick on.
 *
 * The sheet only asks WHERE to add from; picking items or saved outfits happens
 * on CapsuleSelectItems / CapsuleSelectOutfits, which own their own confirm
 * mutation + result toast. Those pages return to the capsule on success, so
 * this component holds no add state of its own.
 */
export const CapsuleAddFlow: React.FC<CapsuleAddFlowProps> = ({
  capsuleId,
  visible,
  onClose,
}) => {
  const navigation = useNavigation<Nav>();

  const handleSelectSource = (source: CapsuleAddSource) => {
    trackCapsuleAddSourceSelected(source);
    onClose();
    if (source === 'wardrobe') {
      navigation.navigate('CapsuleSelectItems', { capsuleId });
    } else {
      navigation.navigate('CapsuleSelectOutfits', { capsuleId, source });
    }
  };

  return (
    <AddSourceSheet
      visible={visible}
      onDismiss={onClose}
      onSelect={handleSelectSource}
    />
  );
};
