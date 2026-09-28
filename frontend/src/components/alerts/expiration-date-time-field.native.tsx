import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';

import { BrandColors } from '@/constants/brand';

import type { ExpirationDateTimeFieldProps } from './expiration-date-time-field.types';

type PickerStep = 'date' | 'time';

const maximumModalWidth = 430;
const modalScreenInset = 6;
const pickerHorizontalInset = 6;

function parsedExpiration(value: string) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function newDraftDate() {
  const date = new Date();
  date.setSeconds(0, 0);
  return date;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mergeDate(base: Date, selected: Date) {
  const next = new Date(base);
  next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return next;
}

function mergeTime(base: Date, selected: Date) {
  const next = new Date(base);
  next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return next;
}

export default function ExpirationDateTimeField({
  error,
  onChange,
  value,
}: ExpirationDateTimeFieldProps) {
  const colorScheme = useColorScheme();
  const { width: windowWidth } = useWindowDimensions();
  const modalWidth = Math.min(maximumModalWidth, Math.max(windowWidth - modalScreenInset * 2, 0));
  const pickerWidth = Math.max(modalWidth - pickerHorizontalInset * 2, 0);
  const selectedExpiration = parsedExpiration(value);
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState<PickerStep>('date');
  const [draftDate, setDraftDate] = useState(() => selectedExpiration ?? newDraftDate());
  const [localError, setLocalError] = useState<string | null>(null);

  const openPicker = () => {
    setDraftDate(parsedExpiration(value) ?? newDraftDate());
    setStep('date');
    setLocalError(null);
    setVisible(true);
  };

  const closePicker = () => {
    setVisible(false);
    setLocalError(null);
  };

  const saveExpiration = () => {
    if (draftDate.getTime() <= Date.now()) {
      setLocalError('Expiration date and time must be in the future.');
      return;
    }

    onChange(draftDate.toISOString());
    closePicker();
  };

  const clearExpiration = () => {
    onChange('');
    closePicker();
  };

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Expiration Date &amp; Time</Text>
        {selectedExpiration ? (
          <Pressable accessibilityRole="button" onPress={clearExpiration}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable
        accessibilityHint="Opens date and time selection"
        accessibilityLabel="Expiration date and time"
        accessibilityRole="button"
        onPress={openPicker}
        style={({ pressed }) => [
          styles.field,
          error && styles.fieldError,
          pressed && styles.pressed,
        ]}>
        {selectedExpiration ? (
          <>
            <View style={styles.valueGroup}>
              <Text style={styles.valueLabel}>Date</Text>
              <Text style={styles.valueText}>{formatDate(selectedExpiration)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.valueGroup}>
              <Text style={styles.valueLabel}>Time</Text>
              <Text style={styles.valueText}>{formatTime(selectedExpiration)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.placeholder}>No expiration selected</Text>
        )}
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        animationType="fade"
        onRequestClose={closePicker}
        transparent
        visible={visible}>
        <View style={styles.backdrop}>
          <View style={[styles.modalCard, { width: modalWidth }]}>
            <View style={styles.modalIntro}>
              <Text style={styles.modalEyebrow}>Alert Validity</Text>
              <Text style={styles.modalTitle}>
                {step === 'date' ? 'Select expiration date' : 'Select expiration time'}
              </Text>
              <Text style={styles.modalHelper}>
                {step === 'date'
                  ? 'Choose the date when this alert should stop being active.'
                  : `Date selected: ${formatDate(draftDate)}`}
              </Text>
            </View>

            <View style={[styles.pickerContainer, { width: pickerWidth }]}>
              <DateTimePicker
                accentColor={BrandColors.red}
                display={step === 'date'
                  ? (Platform.OS === 'ios' ? 'inline' : 'calendar')
                  : (Platform.OS === 'ios' ? 'spinner' : 'clock')}
                key={step}
                minimumDate={step === 'date' ? startOfToday() : undefined}
                mode={step}
                onValueChange={(_event, selected) => {
                  setLocalError(null);
                  setDraftDate((current) => (
                    step === 'date' ? mergeDate(current, selected) : mergeTime(current, selected)
                  ));
                }}
                presentation="inline"
                style={step === 'date' ? styles.datePicker : styles.timePicker}
                themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                value={draftDate}
              />
            </View>

            {localError ? <Text style={styles.modalError}>{localError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={closePicker}
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (step === 'date') {
                    setStep('time');
                    setLocalError(null);
                  } else {
                    saveExpiration();
                  }
                }}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
                <Text style={styles.primaryButtonText}>{step === 'date' ? 'Next' : 'Save'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: 7,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  clearText: {
    color: BrandColors.red,
    fontSize: 13,
    fontWeight: '700',
  },
  field: {
    alignItems: 'center',
    backgroundColor: BrandColors.controlSurface,
    borderColor: BrandColors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  fieldError: {
    borderColor: BrandColors.red,
  },
  valueGroup: {
    flex: 1,
    gap: 2,
  },
  valueLabel: {
    color: BrandColors.muted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  valueText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: BrandColors.border,
    marginHorizontal: 12,
    width: 1,
  },
  placeholder: {
    color: BrandColors.placeholder,
    fontSize: 14,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.78,
  },
  backdrop: {
    alignItems: 'center',
    backgroundColor: BrandColors.modalBackdrop,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: modalScreenInset,
    paddingVertical: 20,
  },
  modalCard: {
    backgroundColor: BrandColors.surfaceElevated,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 430,
    paddingVertical: 18,
  },
  modalIntro: {
    paddingHorizontal: 18,
  },
  modalEyebrow: {
    color: BrandColors.red,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalTitle: {
    color: BrandColors.navy,
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  modalHelper: {
    color: BrandColors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  pickerContainer: {
    alignItems: 'stretch',
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: pickerHorizontalInset,
  },
  datePicker: {
    minHeight: 310,
    width: '100%',
  },
  timePicker: {
    minHeight: 190,
    width: '100%',
  },
  modalError: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '600',
    marginHorizontal: 18,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 18,
    marginTop: 14,
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: BrandColors.border,
    borderRadius: 7,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    color: BrandColors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.primaryAction,
    borderRadius: 7,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  primaryButtonText: {
    color: BrandColors.onPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
});
