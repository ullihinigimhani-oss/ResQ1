import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthTextField } from '@/components/common/auth-components';
import { BrandColors } from '@/constants/brand';
import { alertDisasterTypes, type AlertDisasterType } from '@/types/alert';

export const OTHER_DISASTER_TYPE_OPTION = 'Other';
export const disasterTypeOptions = [...alertDisasterTypes, OTHER_DISASTER_TYPE_OPTION] as const;

export type DisasterTypeSelection = AlertDisasterType | typeof OTHER_DISASTER_TYPE_OPTION | '';

export function disasterTypeSelectionFromValue(value: string | null | undefined): {
  disasterType: DisasterTypeSelection;
  otherDisasterType: string;
} {
  const disasterType = value?.trim() ?? '';

  if (!disasterType) {
    return {
      disasterType: '',
      otherDisasterType: '',
    };
  }

  const predefinedType = alertDisasterTypes.find(
    (option) => option.toLowerCase() === disasterType.toLowerCase(),
  );

  if (predefinedType) {
    return {
      disasterType: predefinedType,
      otherDisasterType: '',
    };
  }

  return {
    disasterType: OTHER_DISASTER_TYPE_OPTION,
    otherDisasterType: disasterType,
  };
}

export function submittedDisasterType(
  disasterType: DisasterTypeSelection,
  otherDisasterType: string,
) {
  return disasterType === OTHER_DISASTER_TYPE_OPTION ? otherDisasterType.trim() : disasterType.trim();
}

export function disasterTypeSummary(
  disasterType: DisasterTypeSelection,
  otherDisasterType: string,
) {
  return submittedDisasterType(disasterType, otherDisasterType) || 'Not selected';
}

export function DisasterTypeSelector({
  customValue,
  error,
  onChange,
  onCustomChange,
  value,
}: {
  customValue: string;
  error?: string;
  onChange: (disasterType: DisasterTypeSelection) => void;
  onCustomChange: (disasterType: string) => void;
  value: DisasterTypeSelection;
}) {
  const [open, setOpen] = useState(false);
  const customError = value === OTHER_DISASTER_TYPE_OPTION && error?.includes('enter') ? error : undefined;
  const selectError = customError ? undefined : error;

  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Disaster Type</Text>
      <Pressable
        accessibilityHint="Opens disaster type options"
        accessibilityLabel="Disaster Type"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={({ pressed }) => [
          styles.selectButton,
          selectError && styles.selectButtonError,
          open && styles.selectButtonOpen,
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.selectText, !value && styles.placeholderText]}>
          {value || 'Select disaster type'}
        </Text>
        <Text style={styles.chevron}>{open ? '^' : 'v'}</Text>
      </Pressable>
      {selectError ? <Text style={styles.errorText}>{selectError}</Text> : null}

      {open ? (
        <View style={styles.optionList}>
          {disasterTypeOptions.map((option) => {
            const selected = value === option;

            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                key={option}
                onPress={() => {
                  onChange(option);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.optionRow,
                  selected && styles.optionRowSelected,
                  pressed && styles.pressed,
                ]}>
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option}
                </Text>
                {selected ? <Text style={styles.selectedMark}>Selected</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {value === OTHER_DISASTER_TYPE_OPTION ? (
        <AuthTextField
          autoCapitalize="words"
          error={customError}
          label="Other Disaster Type"
          onChangeText={onCustomChange}
          placeholder="Enter disaster type"
          value={customValue}
        />
      ) : null}
    </View>
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
  selectButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  selectButtonError: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
  },
  selectButtonOpen: {
    borderColor: BrandColors.deepBlue,
  },
  selectText: {
    color: BrandColors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  placeholderText: {
    color: BrandColors.muted,
    fontWeight: '700',
  },
  chevron: {
    color: BrandColors.deepBlue,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
  },
  optionList: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  optionRow: {
    alignItems: 'center',
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionRowSelected: {
    backgroundColor: BrandColors.lightBlue,
  },
  optionText: {
    color: BrandColors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
  },
  optionTextSelected: {
    color: BrandColors.deepBlue,
    fontWeight: '900',
  },
  selectedMark: {
    color: BrandColors.red,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 15,
    textTransform: 'uppercase',
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 13,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.72,
  },
});
