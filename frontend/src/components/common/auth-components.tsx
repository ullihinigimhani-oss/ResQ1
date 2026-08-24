import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';

import { BrandColors } from '@/constants/brand';
import type { PreferredLanguage } from '@/types/auth';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  rightAccessory?: ReactNode;
};

type AuthButtonProps = {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
};

const languageOptions: PreferredLanguage[] = ['English', 'Sinhala', 'Tamil'];

function handlePressBlur(callback?: () => void) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    (document.activeElement as HTMLElement)?.blur?.();
  }
  callback?.();
}

export function AuthTextField({
  label,
  error,
  rightAccessory,
  style,
  ...textInputProps
}: AuthTextFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, error && styles.inputShellError]}>
        <TextInput
          placeholderTextColor="#8B98A9"
          selectionColor={BrandColors.blue}
          style={[styles.input, rightAccessory ? styles.inputWithAccessory : null, style]}
          {...textInputProps}
        />
        {rightAccessory}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function PasswordField({
  visible,
  onToggleVisible,
  ...textInputProps
}: AuthTextFieldProps & { visible: boolean; onToggleVisible: () => void }) {
  return (
    <AuthTextField
      {...textInputProps}
      secureTextEntry={!visible}
      rightAccessory={
        <Pressable
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => handlePressBlur(onToggleVisible)}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Text style={styles.iconFallback}>{visible ? 'Hide' : 'Show'}</Text>
        </Pressable>
      }
    />
  );
}

export function AuthButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: AuthButtonProps) {
  const inactive = disabled || loading;
  const isSecondary = variant === 'secondary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={inactive}
      onPress={() => handlePressBlur(onPress)}
      style={({ pressed }) => [
        styles.button,
        isSecondary && styles.secondaryButton,
        isDanger && styles.dangerButton,
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={isSecondary ? BrandColors.navy : BrandColors.white} />
      ) : (
        <Text
          style={[
            styles.buttonText,
            isSecondary && styles.secondaryButtonText,
            isDanger && styles.dangerButtonText,
          ]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

export function LinkButton({ title, onPress }: Pick<AuthButtonProps, 'title' | 'onPress'>) {
  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => handlePressBlur(onPress)}
      style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.linkText}>{title}</Text>
    </Pressable>
  );
}

export function LanguageSelector({
  value,
  error,
  onChange,
}: {
  value: PreferredLanguage | '';
  error?: string;
  onChange: (language: PreferredLanguage) => void;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Preferred Language</Text>
      <View style={[styles.languageRow, error && styles.languageRowError]}>
        {languageOptions.map((language) => {
          const selected = value === language;

          return (
            <Pressable
              accessibilityRole="button"
              key={language}
              onPress={() => handlePressBlur(() => onChange(language))}
              style={({ pressed }) => [
                styles.languageOption,
                selected && styles.languageOptionSelected,
                pressed && styles.pressed,
              ]}>
              <Text
                style={[
                  styles.languageOptionText,
                  selected && styles.languageOptionSelectedText,
                ]}>
                {language}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function StatusBanner({
  type,
  message,
}: {
  type: 'success' | 'error';
  message: string;
}) {
  return (
    <View style={[styles.statusBanner, type === 'success' ? styles.successBanner : styles.errorBanner]}>
      <Text style={[styles.statusText, type === 'success' ? styles.successText : styles.errorBannerText]}>
        {message}
      </Text>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Back"
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => handlePressBlur(onPress)}
      style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
      <Text style={styles.backFallback}>Back</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  inputShell: {
    minHeight: 52,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: BrandColors.white,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellError: {
    borderColor: BrandColors.red,
    backgroundColor: BrandColors.redSoft,
  },
  input: {
    color: BrandColors.text,
    flex: 1,
    fontSize: 16,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  inputWithAccessory: {
    paddingRight: 4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFallback: {
    color: BrandColors.deepBlue,
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    minHeight: 52,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 18,
  },
  secondaryButton: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.navy,
    borderWidth: 1,
  },
  dangerButton: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    borderWidth: 1,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: BrandColors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButtonText: {
    color: BrandColors.navy,
  },
  dangerButtonText: {
    color: BrandColors.red,
  },
  linkText: {
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  languageRow: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    padding: 4,
  },
  languageRowError: {
    borderColor: BrandColors.red,
    backgroundColor: BrandColors.redSoft,
  },
  languageOption: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  languageOptionSelected: {
    backgroundColor: BrandColors.deepBlue,
  },
  languageOptionText: {
    color: BrandColors.muted,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  languageOptionSelectedText: {
    color: BrandColors.white,
  },
  statusBanner: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successBanner: {
    backgroundColor: BrandColors.successSoft,
    borderColor: BrandColors.success,
    borderWidth: 1,
  },
  errorBanner: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  successText: {
    color: BrandColors.success,
  },
  errorBannerText: {
    color: BrandColors.red,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  backFallback: {
    color: BrandColors.navy,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
