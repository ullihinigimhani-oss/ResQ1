import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AppHeader,
  DemoNotice,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
  StatusBadge,
} from '@/components/ui/app-components';
import { AuthTextField } from '@/components/common/auth-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';

type AttachedPhoto = {
  id: string;
  source: 'Camera' | 'Gallery';
};

export default function PhotoEvidenceScreen() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [description, setDescription] = useState('');

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <ScreenContainer bottomNav={false}>
        <LoadingState message="Opening photo evidence..." />
      </ScreenContainer>
    );
  }

  const addPhoto = (source: AttachedPhoto['source']) => {
    setPhotos((current) => [
      ...current,
      {
        id: `${source}-${Date.now()}-${current.length}`,
        source,
      },
    ]);
  };

  return (
    <ScreenContainer>
      <AppHeader
        eyebrow="Incident Evidence"
        title="Add Photo Evidence"
        subtitle="Preview-only workflow until secure media storage is connected."
        onBack={() => router.replace('/incidents/report' as Href)}
      />

      <DemoNotice text="Camera/gallery picking and upload storage are not configured in Sprint 1. These controls create local preview placeholders only." />

      <View style={styles.actionGrid}>
        <Pressable
          accessibilityRole="button"
          onPress={() => addPhoto('Camera')}
          style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}>
          <Text style={styles.photoActionTitle}>Take Photo</Text>
          <Text style={styles.photoActionText}>Add a camera placeholder</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => addPhoto('Gallery')}
          style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}>
          <Text style={styles.photoActionTitle}>Choose from Gallery</Text>
          <Text style={styles.photoActionText}>Add a gallery placeholder</Text>
        </Pressable>
      </View>

      <SectionCard title="Attached Photos">
        {photos.length === 0 ? (
          <Text style={styles.mutedText}>No photos attached.</Text>
        ) : (
          <View style={styles.photoList}>
            {photos.map((photo, index) => (
              <View key={photo.id} style={styles.photoRow}>
                <View style={styles.previewBox}>
                  <Text style={styles.previewText}>{index + 1}</Text>
                </View>
                <View style={styles.photoTextBlock}>
                  <Text style={styles.photoTitle}>{photo.source} Evidence</Text>
                  <Text style={styles.photoMeta}>Local preview only</Text>
                </View>
                <StatusBadge label="Not Uploaded" tone="amber" />
              </View>
            ))}
          </View>
        )}
      </SectionCard>

      <SectionCard title="Photo Description">
        <AuthTextField
          label="Description"
          multiline
          numberOfLines={5}
          onChangeText={setDescription}
          placeholder="Describe what the photos show."
          textAlignVertical="top"
          value={description}
        />
      </SectionCard>

      <PrimaryButton title="Return to Incident Report" onPress={() => router.replace('/incidents/report' as Href)} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  actionGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoAction: {
    backgroundColor: colors.white,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    gap: spacing.xs,
    minHeight: 104,
    padding: spacing.md,
  },
  photoActionTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  photoActionText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  photoList: {
    gap: spacing.sm,
  },
  photoRow: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  previewBox: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderRadius: radius.md,
    height: 46,
    justifyContent: 'center',
    width: 46,
  },
  previewText: {
    color: colors.deepBlue,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  photoTextBlock: {
    flex: 1,
    gap: 3,
  },
  photoTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  photoMeta: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  mutedText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
