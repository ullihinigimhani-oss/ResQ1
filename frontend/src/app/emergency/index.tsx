import { StatusBar } from 'expo-status-bar';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackButton } from '@/components/common/auth-components';
import { BottomNavigation } from '@/components/ui/app-components';
import { BrandColors } from '@/constants/brand';
import { useAuth } from '@/context/auth-context';
import type { EmergencyContact } from '@/types/emergency';

const emergencyContacts: EmergencyContact[] = [
  {
    id: '1',
    name: 'Police Emergency',
    contactNumber: '119',
    type: 'police',
    description: 'Sri Lanka Police Emergency Hotline',
  },
  {
    id: '2',
    name: 'Ambulance Service',
    contactNumber: '1990',
    type: 'ambulance',
    description: 'National Ambulance Service',
  },
  {
    id: '3',
    name: 'Fire and Rescue',
    contactNumber: '110',
    type: 'fire',
    description: 'Fire and Rescue Department',
  },
  {
    id: '4',
    name: 'Disaster Management Centre',
    contactNumber: '117',
    type: 'disaster',
    description: 'Disaster Management Centre Hotline',
  },
  {
    id: '5',
    name: 'National Hospital',
    contactNumber: '0112691111',
    type: 'other',
    description: 'National Hospital of Sri Lanka',
  },
];

function EmergencyContactCard({ contact }: { contact: EmergencyContact }) {
  const handleCall = () => {
    Linking.openURL(`tel:${contact.contactNumber}`);
  };

  const getIcon = () => {
    switch (contact.type) {
      case 'police':
        return '👮';
      case 'ambulance':
        return '🚑';
      case 'fire':
        return '🔥';
      case 'disaster':
        return '🆘';
      default:
        return '📞';
    }
  };

  const getTypeColor = () => {
    switch (contact.type) {
      case 'police':
        return BrandColors.navy;
      case 'ambulance':
        return BrandColors.success;
      case 'fire':
        return BrandColors.red;
      case 'disaster':
        return '#FF9500';
      default:
        return BrandColors.blue;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardIcon}>{getIcon()}</Text>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{contact.name}</Text>
            <Text style={styles.cardDescription}>{contact.description}</Text>
            <Text style={styles.cardNumber}>{contact.contactNumber}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleCall}
          style={({ pressed }) => [styles.callButton, { backgroundColor: getTypeColor() }, pressed && styles.pressed]}>
          <Text style={styles.callButtonText}>Call</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function EmergencyScreen() {
  const router = useRouter();
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <BackButton onPress={() => router.replace('/shelters' as Href)} />

        <View style={styles.header}>
          <Text style={styles.eyebrow}>Emergency Contacts</Text>
          <Text style={styles.title}>Emergency Services</Text>
          <Text style={styles.subtitle}>
            Quick access to emergency services and hotlines in Sri Lanka.
          </Text>
        </View>

        <View style={styles.list}>
          {emergencyContacts.map((contact) => (
            <EmergencyContactCard key={contact.id} contact={contact} />
          ))}
        </View>
      </ScrollView>
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: 18,
    paddingHorizontal: 18,
    paddingBottom: 96,
    paddingTop: 18,
  },
  header: {
    gap: 7,
  },
  eyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 34,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  cardIcon: {
    fontSize: 32,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  cardDescription: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  cardNumber: {
    color: BrandColors.red,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  callButton: {
    alignItems: 'center',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 20,
    width: 80,
  },
  callButtonText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 17,
  },
  pressed: {
    opacity: 0.7,
  },
});
