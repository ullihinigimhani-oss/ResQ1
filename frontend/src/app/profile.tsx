import { Redirect, useRouter, type Href } from 'expo-router';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';
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
import { useCurrentLocation } from '@/hooks/use-current-location';
import { updateVolunteerStatus as updateVolunteerStatusApi, updateProfile, API_BASE_URL } from '@/services/authService';
import { getUserSOSStatus } from '@/services/sosService';
import { formatRole, initials, isAuthorityRole } from '@/utils/format';
import type { SOSRequestWithVolunteer } from '@/types/sos';

import OpenStreetMap from '@/components/shelters/openstreet-map';

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
  const { currentArea } = useCurrentLocation();
  const [isShining, setIsShining] = useState(user?.isVolunteeringActive || false);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<{ latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number } | null>(null);
  const [sosRequest, setSosRequest] = useState<SOSRequestWithVolunteer | null>(null);
  const [volunteerSOSRequest, setVolunteerSOSRequest] = useState<any>(null);
  const [volunteerToggleModalVisible, setVolunteerToggleModalVisible] = useState(false);
  const previousSOSStatusRef = useRef<string | null>(null);
  const isWeb = Platform.OS === 'web';
  const authenticatedUserId = user?.id ?? null;

  useEffect(() => {
    if (isLoading || !authenticatedUserId || !token || isWeb) {
      return;
    }

    const checkSOSStatus = async () => {
      try {
        const status = await getUserSOSStatus(token);
        setSosRequest(status);
      } catch (error) {
        console.error('Failed to check SOS status:', error);
      }
    };

    void checkSOSStatus();
    const interval = setInterval(() => void checkSOSStatus(), 5000);

    return () => clearInterval(interval);
  }, [authenticatedUserId, isLoading, isWeb, token]);

  useEffect(() => {
    if (!token || isWeb || !user?.isVolunteer || !user.isVolunteeringActive) {
      return;
    }

    const checkVolunteerSOSStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/sos/volunteer-accepted`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        const data = await response.json();
        const currentSOS = data.request;
        console.log('Volunteer SOS status:', currentSOS);

        // Check if SOS status changed from accepted to completed
        if (currentSOS && currentSOS.status === 'completed' && previousSOSStatusRef.current === 'accepted') {
          const statusMessages: Record<string, string> = {
            'assistant_came': 'Emergency Assistant Came',
            'rescued': 'Rescued',
            'safe_shelter': 'Safe Shelter',
          };
          const statusMessage = statusMessages[currentSOS.evacuationStatus] || 'Safe';
          alert(`The disaster victim has been marked as ${statusMessage}. They are safe now.`);
        }

        previousSOSStatusRef.current = currentSOS?.status || null;
        setVolunteerSOSRequest(currentSOS);
      } catch (error) {
        console.error('Failed to check volunteer SOS status:', error);
      }
    };

    void checkVolunteerSOSStatus();
    const interval = setInterval(() => void checkVolunteerSOSStatus(), 5000);

    return () => clearInterval(interval);
  }, [isWeb, token, user?.isVolunteer, user?.isVolunteeringActive]);

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
  };

  const handleToggleVolunteer = () => {
    setVolunteerToggleModalVisible(true);
  };

  const handleConfirmVolunteerToggle = async () => {
    setVolunteerToggleModalVisible(false);
    if (!token || !user) return;

    try {
      const newVolunteerStatus = !user.isVolunteer;
      await updateProfile(token, {
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber || undefined,
        location: user.location || '',
        preferredLanguage: user.preferredLanguage as 'English' | 'Sinhala' | 'Tamil',
        isVolunteer: newVolunteerStatus,
      });
      // Logout after updating volunteer status
      await signOut();
    } catch (error) {
      console.error('Failed to update volunteer status:', error);
      alert('Failed to update volunteer status. Please try again.');
    }
  };

  const handleCancelVolunteerToggle = () => {
    setVolunteerToggleModalVisible(false);
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

  const handleRouteToVictim = async () => {
    console.log('handleRouteToVictim called');
    if (!user?.volunteerAreaLatitude || !user?.volunteerAreaLongitude) {
      alert('Please set your volunteer area first by clicking Volunteer Now.');
      return;
    }

    if (!token) return;

    try {
      console.log('Fetching SOS from:', `${API_BASE_URL}/api/sos/volunteer-accepted`);
      
      const response = await fetch(`${API_BASE_URL}/api/sos/volunteer-accepted`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get SOS request');
      }

      const sosRequest = data.request;

      if (!sosRequest) {
        alert('No any Victims to rescue');
        return;
      }

      // Check if the SOS request is completed (user is safe)
      if (sosRequest.status === 'completed') {
        const statusMessages: Record<string, string> = {
          'assistant_came': 'Emergency Assistant Came',
          'rescued': 'Rescued',
          'safe_shelter': 'Safe Shelter',
        };
        const statusMessage = statusMessages[sosRequest.evacuationStatus] || 'Safe';
        alert(`The disaster victim has been marked as ${statusMessage}. They are safe now.`);
        return;
      }

      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${user.volunteerAreaLatitude},${user.volunteerAreaLongitude}&destination=${sosRequest.latitude},${sosRequest.longitude}&travelmode=driving`;
      
      Linking.openURL(googleMapsUrl).catch((error) => {
        console.error('Failed to open Google Maps:', error);
        alert('Unable to open Google Maps. Please ensure you have Google Maps installed.');
      });
    } catch (error) {
      console.error('Failed to get SOS request:', error);
      alert(`Failed to get SOS request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
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
          {user.phoneNumber && <Text style={styles.phoneNumber}>{user.phoneNumber}</Text>}
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

      {user.isVolunteer && user.isVolunteeringActive && user?.volunteerAreaLatitude && user?.volunteerAreaLongitude && volunteerSOSRequest?.status === 'accepted' ? (
        <PrimaryButton
          onPress={handleRouteToVictim}
          title="Route to Disaster Victim"
          tone="navy"
        />
      ) : null}

      <SectionCard title="Personal Details">
        <InfoRow label="Full Name" value={user.fullName} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Preferred Language" value={user.preferredLanguage} />
        <InfoRow label="Role" value={formatRole(user.role)} />
      </SectionCard>

      <SectionCard title="Location">
        <InfoRow label="Registered Area" value={user.location || 'Not set'} />
        <InfoRow label="Current Area" value={currentArea} />
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
        <View style={styles.volunteerToggleSection}>
          <Text style={styles.volunteerToggleLabel}>Emergency Volunteer</Text>
          <Pressable
            onPress={handleToggleVolunteer}
            style={({ pressed }) => [
              styles.volunteerToggle,
              user.isVolunteer ? styles.volunteerToggleOn : styles.volunteerToggleOff,
              pressed && styles.volunteerTogglePressed,
            ]}>
            <View style={[styles.toggleKnob, user.isVolunteer ? styles.toggleKnobOn : styles.toggleKnobOff]} />
          </Pressable>
        </View>
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
        animationType="fade"
        transparent={true}
        visible={volunteerToggleModalVisible}
        onRequestClose={handleCancelVolunteerToggle}>
        <View style={styles.volunteerToggleModalOverlay}>
          <View style={styles.volunteerToggleModalContent}>
            <Text style={styles.volunteerToggleModalTitle}>
              {user?.isVolunteer ? 'Disable Emergency Volunteer' : 'Enable Emergency Volunteer'}
            </Text>
            <Text style={styles.volunteerToggleModalMessage}>
              {user?.isVolunteer 
                ? 'You will be logged out after disabling emergency volunteer status. Please log in again to continue.'
                : 'You will be logged out after enabling emergency volunteer status. Please log in again to continue.'}
            </Text>
            <View style={styles.volunteerToggleModalButtons}>
              <Pressable
                style={({ pressed }) => [styles.volunteerToggleCancelButton, pressed && styles.volunteerToggleButtonPressed]}
                onPress={handleCancelVolunteerToggle}>
                <Text style={styles.volunteerToggleCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.volunteerToggleConfirmButton, pressed && styles.volunteerToggleButtonPressed]}
                onPress={handleConfirmVolunteerToggle}>
                <Text style={styles.volunteerToggleConfirmButtonText}>Confirm & Logout</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
              {Platform.OS !== 'web' ? (
                <OpenStreetMap
                  initialRegion={{
                    latitude: 6.9271,
                    longitude: 79.8612,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  markers={selectedRegion ? [{ latitude: selectedRegion.latitude, longitude: selectedRegion.longitude, title: 'Volunteer Area', color: '#ff0000' }] : []}
                  circles={selectedRegion ? [{
                    center: {
                      latitude: selectedRegion.latitude,
                      longitude: selectedRegion.longitude
                    },
                    radius: 8000,
                    strokeColor: 'rgba(255, 0, 0, 0.5)',
                    fillColor: 'rgba(255, 0, 0, 0.1)'
                  }] : []}
                  onMapPress={handleMapPress}
                  style={styles.map}
                />
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
  phoneNumber: {
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
    backgroundColor: colors.emergencyDeep,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  volunteerNowButtonShining: {
    backgroundColor: colors.emergencyBright,
    shadowColor: colors.emergencyBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  volunteerNowButtonPressed: {
    opacity: 0.8,
  },
  volunteerNowButtonText: {
    color: colors.onPrimary,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    textAlign: 'center',
    flexWrap: 'nowrap',
  },
  mapModalOverlay: {
    backgroundColor: colors.modalBackdrop,
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
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  volunteerToggleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  volunteerToggleLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  volunteerToggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  volunteerToggleOn: {
    backgroundColor: colors.emergencyDeep,
  },
  volunteerToggleOff: {
    backgroundColor: colors.border,
  },
  volunteerTogglePressed: {
    opacity: 0.8,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: colors.cardShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  toggleKnobOff: {
    alignSelf: 'flex-start',
  },
  volunteerToggleModalOverlay: {
    backgroundColor: colors.modalBackdrop,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  volunteerToggleModalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 320,
  },
  volunteerToggleModalTitle: {
    color: colors.navy,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  volunteerToggleModalMessage: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  volunteerToggleModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  volunteerToggleCancelButton: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  volunteerToggleConfirmButton: {
    flex: 1,
    backgroundColor: colors.emergencyDeep,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  volunteerToggleButtonPressed: {
    opacity: 0.8,
  },
  volunteerToggleCancelButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  volunteerToggleConfirmButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
});
