import { Redirect, useRouter, type Href } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Platform } from 'react-native';

import {
  AppIcon,
  AppHeader,
  InfoRow,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import { updateVolunteerStatus as updateVolunteerStatusApi } from '@/services/authService';
import { formatRole, initials, isAuthorityRole } from '@/utils/format';

let MapView: any, Circle: any, Marker: any;
if (Platform.OS !== 'web') {
  const nativeMap = require('@/components/shelters/native-map');
  MapView = nativeMap.default;
  Circle = nativeMap.Circle;
  Marker = nativeMap.Marker;
}

function ActionRow({
  icon,
  label,
  onPress,
  status,
}: {
  icon?: string;
  label: string;
  onPress: () => void;
  status?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}>
      {icon ? (
        <View style={styles.actionIcon}>
          <AppIcon fallback="D" name={icon} size={18} tintColor={colors.deepBlue} />
        </View>
      ) : null}
      <Text style={styles.actionLabel}>{label}</Text>
      {status ? <StatusBadge label={status} tone="amber" /> : <Text style={styles.actionArrow}>{'>'}</Text>}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoading, signOut, user, token, updateUser } = useAuth();
  const [isShining, setIsShining] = useState(user?.isVolunteeringActive || false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Loading your resident profile..." />
      </ScreenContainer>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    router.replace('/auth/welcome' as Href);
  };

  const handleVolunteerNow = async () => {
    if (user?.isVolunteeringActive) {
      if (token && user) {
        try {
          const updatedUser = await updateVolunteerStatusApi(token, {
            volunteerAreaLatitude: null,
            volunteerAreaLongitude: null,
            isVolunteeringActive: false,
          });
          await updateUser(updatedUser);
          setIsShining(false);
        } catch (error) {
          console.error('Failed to update volunteer status:', error);
        }
      }
    } else {
      setMapModalVisible(true);
    }
  };

  const handleMapRegionSelect = async () => {
    if (selectedRegion && token && user) {
      try {
        const updatedUser = await updateVolunteerStatusApi(token, {
          volunteerAreaLatitude: selectedRegion.latitude,
          volunteerAreaLongitude: selectedRegion.longitude,
          isVolunteeringActive: true,
        });
        await updateUser(updatedUser);
        setIsShining(true);
        setMapModalVisible(false);
      } catch (error) {
        console.error('Failed to update volunteer status:', error);
      }
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setSelectedRegion({
      latitude,
      longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    });
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Resident Account"
        title="My Profile"
        subtitle="Your real Sprint 1 account details and future resident profile tools."
      />

      <View style={styles.identityPanel}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user.fullName)}</Text>
        </View>
        <View style={styles.identityBlock}>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.identityBadges}>
            <StatusBadge label={`Resident ID ${user.id}`} tone="blue" />
            <StatusBadge label={formatRole(user.role)} tone="green" />
          </View>
        </View>
      </View>

      {user.isVolunteer && (
        <Pressable
          onPress={handleVolunteerNow}
          style={({ pressed }) => [
            styles.volunteerNowButton,
            user.isVolunteeringActive && isShining && styles.volunteerNowButtonShining,
            pressed && styles.volunteerNowButtonPressed,
          ]}>
          <Text style={styles.volunteerNowButtonText}>
            {user.isVolunteeringActive ? 'Volunteering Active' : 'Volunteer Now'}
          </Text>
        </Pressable>
      )}

      <SectionCard title="Personal Details">
        <InfoRow label="Full Name" value={user.fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Preferred Language" value={user.preferredLanguage} />
        <InfoRow label="Role" value={formatRole(user.role)} />
      </SectionCard>

      <SectionCard title="Location">
        <InfoRow label="Registered Area" value={user.location || 'Not set'} />
      </SectionCard>

      <SectionCard title="Account">
        <ActionRow label="Edit Profile" onPress={() => router.push('/profile/edit' as Href)} />
        <ActionRow label="Change Password" onPress={() => router.push('/profile/change-password' as Href)} />
        <ActionRow
          label="Household Information"
          onPress={() => router.push('/household' as Href)}
        />
        <ActionRow
          label="Emergency Contacts"
          onPress={() => router.push('/emergency-contacts' as Href)}
        />
        <ActionRow label="Settings" onPress={() => router.push('/settings' as Href)} />
        {!isAuthorityRole(user.role) ? (
          <ActionRow
            icon="arrow.down.circle.fill"
            label="Offline Safety Instructions"
            onPress={() => router.push('/offline-safety' as Href)}
          />
        ) : null}
      </SectionCard>

      <PrimaryButton title="Sign Out" tone="red" onPress={handleSignOut} />

      <Modal
        animationType="slide"
        transparent={true}
        visible={mapModalVisible}
        onRequestClose={() => setMapModalVisible(false)}>
        <View style={styles.mapModalOverlay}>
          <View style={styles.mapModalContent}>
            <Text style={styles.mapModalTitle}>Select Volunteer Area</Text>
            <Text style={styles.mapModalSubtitle}>Tap on the map to select your volunteer area</Text>
            <View style={styles.mapContainer}>
              {Platform.OS !== 'web' && MapView ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: 6.9271,
                    longitude: 79.8612,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  onPress={handleMapPress}>
                  {selectedRegion && (
                    <>
                      <Circle
                        center={{
                          latitude: selectedRegion.latitude,
                          longitude: selectedRegion.longitude,
                        }}
                        radius={8000}
                        strokeColor="rgba(255, 0, 0, 0.5)"
                        fillColor="rgba(255, 0, 0, 0.1)"
                      />
                      <Marker
                        coordinate={{
                          latitude: selectedRegion.latitude,
                          longitude: selectedRegion.longitude,
                        }}
                      />
                    </>
                  )}
                </MapView>
              ) : (
                <View style={styles.webMapPlaceholder}>
                  <Text style={styles.webMapPlaceholderText}>
                    Volunteer area selection is only available on mobile. Please use the mobile app to select your volunteer area.
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.mapModalButtons}>
              <Pressable
                style={({ pressed }) => [styles.mapCancelButton, pressed && styles.mapCancelButtonPressed]}
                onPress={() => setMapModalVisible(false)}>
                <Text style={styles.mapCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.mapConfirmButton,
                  !selectedRegion && styles.mapConfirmButtonDisabled,
                  pressed && styles.mapConfirmButtonPressed,
                ]}
                onPress={handleMapRegionSelect}
                disabled={!selectedRegion}>
                <Text style={styles.mapConfirmButtonText}>Confirm Area</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  identityPanel: {
    alignItems: 'center',
    backgroundColor: colors.identitySurface,
    borderColor: colors.identityBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 25,
  },
  identityBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  name: {
    color: colors.onPrimary,
    fontSize: 21,
    fontWeight: '700',
    lineHeight: 27,
  },
  email: {
    color: colors.onPrimaryMuted,
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  identityBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  actionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 56,
    paddingVertical: spacing.md,
  },
  actionLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  actionIcon: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionArrow: {
    color: colors.deepBlue,
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  pressed: {
    opacity: 0.72,
  },
  volunteerNowButton: {
    backgroundColor: '#8B0000',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  volunteerNowButtonShining: {
    backgroundColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  volunteerNowButtonPressed: {
    opacity: 0.8,
  },
  volunteerNowButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  mapModalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  mapModalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  mapModalTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  mapModalSubtitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  mapContainer: {
    height: 300,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  map: {
    flex: 1,
  },
  webMapPlaceholder: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webMapPlaceholderText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
  },
  mapModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  mapCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapCancelButtonPressed: {
    opacity: 0.8,
  },
  mapCancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  mapConfirmButton: {
    flex: 1,
    backgroundColor: colors.navy,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mapConfirmButtonDisabled: {
    backgroundColor: colors.border,
  },
  mapConfirmButtonPressed: {
    opacity: 0.8,
  },
  mapConfirmButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
  },
});
