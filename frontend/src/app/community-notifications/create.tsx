import { StatusBar } from 'expo-status-bar';
import { Redirect, useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthButton, AuthTextField, BackButton, StatusBanner } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  createCommunityNotification,
  isCommunityNotificationApiError,
} from '@/services/communityNotificationService';
import {
  communityNotificationCategories,
  type CommunityNotificationCategory,
  type CommunityNotificationFieldErrors,
  type CreateCommunityNotificationPayload,
} from '@/types/communityNotification';
import { isAuthorityRole } from '@/utils/format';
import {
  communityNotificationUiText,
  translateCommunityNotificationCategory,
} from '@/utils/language';

type CommunityNotificationForm = {
  category: CommunityNotificationCategory;
  expiresAt: string;
  message: string;
  targetArea: string;
  title: string;
};

type TextFieldName = 'expiresAt' | 'message' | 'targetArea' | 'title';

const initialForm: CommunityNotificationForm = {
  category: 'ROAD_ACCESS',
  expiresAt: '',
  message: '',
  targetArea: '',
  title: '',
};

function validateForm(form: CommunityNotificationForm) {
  const errors: CommunityNotificationFieldErrors = {};
  const title = form.title.trim();
  const targetArea = form.targetArea.trim();
  const message = form.message.trim();
  const expiresAtText = form.expiresAt.trim();
  let expiresAt: string | null = null;

  if (!title) {
    errors.title = 'Please enter a notification title.';
  }

  if (!targetArea) {
    errors.targetArea = 'Please enter a target area.';
  }

  if (!message) {
    errors.message = 'Please enter the notification message.';
  }

  if (expiresAtText) {
    const expirationDate = new Date(expiresAtText);
    const expirationTime = expirationDate.getTime();

    if (!Number.isFinite(expirationTime)) {
      errors.expiresAt = 'Expiry date/time must be a valid date and time.';
    } else if (expirationTime <= Date.now()) {
      errors.expiresAt = 'Expiry date/time must be in the future.';
    } else {
      expiresAt = expirationDate.toISOString();
    }
  }

  const payload: CreateCommunityNotificationPayload = {
    category: form.category,
    expiresAt,
    message,
    targetArea,
    title,
  };

  return {
    errors,
    payload,
  };
}

export default function CreateCommunityNotificationScreen() {
  const router = useRouter();
  const { isLoading, token, user } = useAuth();
  const [form, setForm] = useState<CommunityNotificationForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<CommunityNotificationFieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const copy = communityNotificationUiText.English;

  const updateField = (field: TextFieldName, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const updateCategory = (category: CommunityNotificationCategory) => {
    setForm((current) => ({
      ...current,
      category,
    }));
    setFieldErrors((current) => ({
      ...current,
      category: undefined,
    }));
  };

  const publishNotification = async (payload: CreateCommunityNotificationPayload) => {
    if (!token) {
      setMessage('Please log in to publish a community notification.');
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const createdNotification = await createCommunityNotification(payload, token);
      router.replace({
        pathname: '/community-notifications/[id]',
        params: {
          id: String(createdNotification.id),
          published: '1',
        },
      } as unknown as Href);
    } catch (error) {
      if (isCommunityNotificationApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
      } else if (__DEV__) {
        console.warn('Unexpected community notification publishing error:', error);
      }

      setMessage(copy.unablePublish);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (submitting) {
      return;
    }

    const validation = validateForm(form);

    if (Object.keys(validation.errors).length > 0) {
      setFieldErrors(validation.errors);
      setMessage(null);
      return;
    }

    void publishNotification(validation.payload);
  };

  if (!isLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (isLoading || !user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={BrandColors.red} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthorityRole(user.role)) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.restrictedContent}>
          <BackButton onPress={() => router.replace('/community-notifications' as Href)} />
          <View style={styles.restrictedPanel}>
            <Text style={styles.restrictedEyebrow}>Restricted Module</Text>
            <Text style={styles.restrictedTitle}>Community notification publishing is protected</Text>
            <Text style={styles.restrictedText}>
              Only authorized ResQ1 authority or admin accounts can publish community notifications.
            </Text>
            <AuthButton
              title={copy.communityNotifications}
              variant="secondary"
              onPress={() => router.replace('/community-notifications' as Href)}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <BackButton onPress={() => router.replace('/community-notifications' as Href)} />

          <View style={styles.header}>
            <Text style={styles.eyebrow}>Community Information</Text>
            <Text style={styles.title}>{copy.createCommunityNotification}</Text>
            <Text style={styles.subtitle}>{copy.shareLocalInformation}</Text>
          </View>

          {message ? <StatusBanner message={message} type="error" /> : null}

          <View style={styles.form}>
            <View style={styles.section}>
              <AuthTextField
                autoCapitalize="sentences"
                error={fieldErrors.title}
                label={copy.notificationTitle}
                onChangeText={(value) => updateField('title', value)}
                placeholder="Road Closure"
                value={form.title}
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>{copy.category}</Text>
                <View style={[styles.categoryGrid, fieldErrors.category && styles.selectorError]}>
                  {communityNotificationCategories.map((category) => {
                    const selected = form.category === category;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        key={category}
                        onPress={() => updateCategory(category)}
                        style={({ pressed }) => [
                          styles.categoryOption,
                          selected && styles.categoryOptionSelected,
                          pressed && styles.pressed,
                        ]}>
                        <Text style={[styles.categoryOptionText, selected && styles.categoryOptionTextSelected]}>
                          {translateCommunityNotificationCategory(category, 'English')}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                {fieldErrors.category ? <Text style={styles.errorText}>{fieldErrors.category}</Text> : null}
              </View>

              <AuthTextField
                autoCapitalize="words"
                error={fieldErrors.targetArea}
                label={copy.targetArea}
                onChangeText={(value) => updateField('targetArea', value)}
                placeholder="Panadura or ALL"
                value={form.targetArea}
              />

              <AuthTextField
                autoCapitalize="sentences"
                error={fieldErrors.message}
                label={copy.message}
                multiline
                numberOfLines={5}
                onChangeText={(value) => updateField('message', value)}
                placeholder="Temporary road restrictions are in effect due to maintenance."
                style={styles.textAreaInput}
                textAlignVertical="top"
                value={form.message}
              />

              <AuthTextField
                autoCapitalize="none"
                error={fieldErrors.expiresAt}
                label={copy.expiresAt}
                onChangeText={(value) => updateField('expiresAt', value)}
                placeholder="2026-08-25T10:30:00"
                value={form.expiresAt}
              />
            </View>
          </View>

          <View style={styles.publishPanel}>
            <Text style={styles.publishTitle}>{copy.publishNotification}</Text>
            <Text style={styles.publishCopy}>
              This will publish a non-emergency community update for the selected area.
            </Text>
            <AuthButton
              disabled={submitting}
              loading={submitting}
              title={copy.publishNotification}
              onPress={handleSubmit}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: BrandColors.background,
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  restrictedContent: {
    flex: 1,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  restrictedPanel: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  restrictedEyebrow: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  restrictedTitle: {
    color: BrandColors.navy,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  restrictedText: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  header: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: BrandColors.navy,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36,
  },
  subtitle: {
    color: BrandColors.muted,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  form: {
    gap: spacing.md,
  },
  section: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.lg,
    padding: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  label: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  categoryGrid: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    padding: spacing.sm,
  },
  selectorError: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  categoryOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: '47%',
    paddingHorizontal: spacing.sm,
  },
  categoryOptionSelected: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  categoryOptionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  categoryOptionTextSelected: {
    color: colors.white,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  textAreaInput: {
    minHeight: 116,
    paddingTop: 13,
  },
  publishPanel: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.deepBlue,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.lg,
  },
  publishTitle: {
    color: BrandColors.white,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 24,
  },
  publishCopy: {
    color: BrandColors.sky,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  pressed: {
    opacity: 0.72,
  },
});
