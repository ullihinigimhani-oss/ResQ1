import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { useSOS } from '@/context/sos-context';

export function SOSModal() {
  const { sosRequest, modalVisible, respondToSOS, closeModal } = useSOS();

  const handleReady = () => {
    respondToSOS(true);
  };

  const handleNotReady = () => {
    respondToSOS(false);
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeModal}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Emergency Assistance Needed!</Text>
          <Text style={styles.modalSubtitle}>
            {sosRequest?.userName} needs help at their location.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.readyButton, pressed && styles.readyButtonPressed]}
            onPress={handleReady}>
            <Text style={styles.readyButtonText}>Emergency Rescue Team is Ready</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.notReadyButton, pressed && styles.notReadyButtonPressed]}
            onPress={handleNotReady}>
            <Text style={styles.notReadyButtonText}>Not Ready</Text>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: BrandColors.muted,
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  readyButton: {
    backgroundColor: BrandColors.success,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  readyButtonPressed: {
    opacity: 0.8,
  },
  readyButtonText: {
    color: BrandColors.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  notReadyButton: {
    backgroundColor: BrandColors.muted,
    borderRadius: 8,
    padding: 16,
  },
  notReadyButtonPressed: {
    opacity: 0.8,
  },
  notReadyButtonText: {
    color: BrandColors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
