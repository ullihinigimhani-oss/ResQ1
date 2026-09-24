import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';

interface EvacuationStatusModalProps {
  visible: boolean;
  onClose: () => void;
  onUpdateStatus: (status: 'assistant_came' | 'rescued' | 'safe_shelter' | 'still_in_disaster') => void;
}

export function EvacuationStatusModal({ visible, onClose, onUpdateStatus }: EvacuationStatusModalProps) {
  const handleStatusUpdate = (status: 'assistant_came' | 'rescued' | 'safe_shelter' | 'still_in_disaster') => {
    onUpdateStatus(status);
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Update Evacuation Status</Text>
          <Pressable
            style={({ pressed }) => [styles.statusButton, pressed && styles.statusButtonPressed]}
            onPress={() => handleStatusUpdate('assistant_came')}>
            <Text style={styles.statusButtonText}>Emergency Assistant Came</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statusButton, pressed && styles.statusButtonPressed]}
            onPress={() => handleStatusUpdate('rescued')}>
            <Text style={styles.statusButtonText}>Rescued</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statusButton, pressed && styles.statusButtonPressed]}
            onPress={() => handleStatusUpdate('safe_shelter')}>
            <Text style={styles.statusButtonText}>Go to the safe shelter</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.statusButton, styles.stillInDisasterButton, pressed && styles.statusButtonPressed]}
            onPress={() => handleStatusUpdate('still_in_disaster')}>
            <Text style={styles.statusButtonText}>Still in disaster</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: BrandColors.background,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 320,
  },
  modalTitle: {
    color: BrandColors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusButton: {
    backgroundColor: BrandColors.success,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  stillInDisasterButton: {
    backgroundColor: BrandColors.red,
  },
  statusButtonPressed: {
    opacity: 0.8,
  },
  statusButtonText: {
    color: BrandColors.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: BrandColors.muted,
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  cancelButtonPressed: {
    opacity: 0.8,
  },
  cancelButtonText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
