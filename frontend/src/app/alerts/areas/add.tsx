import { Redirect, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  AppHeader,
  LoadingState,
  PrimaryButton,
  ScreenContainer,
  SectionCard,
} from '@/components/ui/app-components';
import { colors, radius, spacing } from '@/constants/design';
import { useAuth } from '@/context/auth-context';
import {
  createAlertAreaSubscription,
  getAvailableAlertAreas,
  isAlertApiError,
} from '@/services/alertService';
import {
  alertAreaLabels,
  type AlertAreaLabel,
  type AlertAreaSubscriptionFieldErrors,
} from '@/types/alertAreaSubscription';
import { isAuthorityRole } from '@/utils/format';

export default function AddAlertAreaScreen() {
  const router = useRouter();
  const { isLoading: authLoading, token, user } = useAuth();
  const [areaName, setAreaName] = useState('');
  const [label, setLabel] = useState<AlertAreaLabel>('Home');
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AlertAreaSubscriptionFieldErrors>({});

  const loadOptions = useCallback(async () => {
    if (!token || !user || isAuthorityRole(user.role)) {
      setLoadingOptions(false);
      return;
    }

    setLoadingOptions(true);
    setErrorMessage(null);

    try {
      setAvailableAreas(await getAvailableAlertAreas(token));
    } catch {
      setErrorMessage('Area suggestions are unavailable. You can still enter an area manually.');
    } finally {
      setLoadingOptions(false);
    }
  }, [token, user]);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const matchingAreas = useMemo(() => {
    const query = areaName.trim().toLowerCase();

    if (!query) {
      return availableAreas.slice(0, 6);
    }

    return availableAreas
      .filter((area) => area.toLowerCase().includes(query) && area.toLowerCase() !== query)
      .slice(0, 6);
  }, [areaName, availableAreas]);

  if (!authLoading && !user) {
    return <Redirect href={'/auth/welcome' as Href} />;
  }

  if (!authLoading && user && isAuthorityRole(user.role)) {
    return <Redirect href={'/alerts' as Href} />;
  }

  if (authLoading || !user) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading alert area form..." />
      </ScreenContainer>
    );
  }

  const submit = async () => {
    if (!token || saving) {
      return;
    }

    const trimmedAreaName = areaName.trim();

    if (!trimmedAreaName) {
      setFieldErrors({ areaName: 'Area or location is required.' });
      return;
    }

    setSaving(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const subscription = await createAlertAreaSubscription({
        areaName: trimmedAreaName,
        label,
      }, token);

      router.replace({
        pathname: '/alerts/areas',
        params: { added: subscription.areaName },
      } as unknown as Href);
    } catch (error) {
      if (isAlertApiError(error)) {
        setFieldErrors(error.fieldErrors ?? {});
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Unable to subscribe to this area. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <AppHeader
        onBack={() => router.replace('/alerts/areas' as Href)}
        subtitle="Choose a place you want ResQ1 to monitor for emergency alerts."
        title="Add Alert Area"
      />

      <SectionCard title="Area Label" subtitle="Choose how this location should be identified.">
        <View style={styles.labelOptions}>
          {alertAreaLabels.map((option) => {
            const selected = label === option;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                onPress={() => {
                  setLabel(option);
                  setFieldErrors((current) => ({ ...current, label: undefined }));
                }}
                style={({ pressed }) => [
                  styles.labelOption,
                  selected && styles.labelOptionSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.labelOptionText, selected && styles.labelOptionTextSelected]}>
                  {option}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {fieldErrors.label ? <Text style={styles.fieldError}>{fieldErrors.label}</Text> : null}
      </SectionCard>

      <SectionCard title="Area / Location" subtitle="Use the same area name used by emergency alerts.">
        <TextInput
          accessibilityLabel="Area or location"
          autoCapitalize="words"
          maxLength={150}
          onChangeText={(value) => {
            setAreaName(value);
            setFieldErrors((current) => ({ ...current, areaName: undefined }));
            setErrorMessage(null);
          }}
          placeholder="Enter an area or location"
          placeholderTextColor={colors.placeholder}
          style={[styles.areaInput, fieldErrors.areaName && styles.areaInputError]}
          value={areaName}
        />
        {fieldErrors.areaName ? <Text style={styles.fieldError}>{fieldErrors.areaName}</Text> : null}

        {loadingOptions ? <Text style={styles.suggestionHint}>Loading area suggestions...</Text> : null}
        {!loadingOptions && matchingAreas.length > 0 ? (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionHint}>Available areas</Text>
            {matchingAreas.map((area) => (
              <Pressable
                accessibilityRole="button"
                key={area}
                onPress={() => {
                  setAreaName(area);
                  setFieldErrors((current) => ({ ...current, areaName: undefined }));
                }}
                style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}>
                <Text style={styles.suggestionText}>{area}</Text>
                <Text style={styles.suggestionArrow}>+</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </SectionCard>

      {errorMessage ? (
        <View style={styles.errorMessage}>
          <Text style={styles.errorMessageText}>{errorMessage}</Text>
        </View>
      ) : null}

      <PrimaryButton
        disabled={!areaName.trim()}
        loading={saving}
        onPress={() => void submit()}
        title="Subscribe to Area"
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  labelOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  labelOption: {
    alignItems: 'center',
    backgroundColor: colors.lightBlue,
    borderColor: colors.sky,
    borderRadius: radius.md,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: '45%',
    paddingHorizontal: spacing.md,
  },
  labelOptionSelected: {
    backgroundColor: colors.primaryAction,
    borderColor: colors.primaryAction,
  },
  labelOptionText: {
    color: colors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  labelOptionTextSelected: {
    color: colors.onPrimary,
  },
  areaInput: {
    backgroundColor: colors.controlSurface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    minHeight: 46,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  areaInputError: {
    borderColor: colors.red,
  },
  fieldError: {
    color: colors.red,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  suggestions: {
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  suggestionHint: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    lineHeight: 15,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    textTransform: 'uppercase',
  },
  suggestionRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  suggestionArrow: {
    color: colors.deepBlue,
    fontSize: 16,
    fontWeight: '900',
  },
  errorMessage: {
    backgroundColor: colors.redSoft,
    borderColor: colors.redBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorMessageText: {
    color: colors.red,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
