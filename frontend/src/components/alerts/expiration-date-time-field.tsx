import { createElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';

import type { ExpirationDateTimeFieldProps } from './expiration-date-time-field.types';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function localDateValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localTimeValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function initialValues(value: string) {
  const parsed = value ? new Date(value) : null;

  if (!parsed || Number.isNaN(parsed.getTime())) {
    return { date: '', time: '' };
  }

  return {
    date: localDateValue(parsed),
    time: localTimeValue(parsed),
  };
}

function combineLocalDateTime(dateValue: string, timeValue: string) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);
  const [hour, minute] = timeValue.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);

  return Number.isNaN(date.getTime()) ? null : date;
}

function futureLocalDateTime(dateValue: string, timeValue: string) {
  const selected = combineLocalDateTime(dateValue, timeValue);

  return selected && selected.getTime() > Date.now() ? selected : null;
}

export default function ExpirationDateTimeField({
  error,
  onChange,
  value,
}: ExpirationDateTimeFieldProps) {
  const initial = initialValues(value);
  const [dateValue, setDateValue] = useState(initial.date);
  const [timeValue, setTimeValue] = useState(initial.time);
  const [localError, setLocalError] = useState<string | null>(null);

  const updateValue = (nextDate: string, nextTime: string) => {
    setLocalError(null);

    if (!nextDate || !nextTime) {
      onChange('');
      return;
    }

    const selected = futureLocalDateTime(nextDate, nextTime);

    if (!selected) {
      onChange('');
      setLocalError('Expiration date and time must be in the future.');
      return;
    }

    onChange(selected.toISOString());
  };

  const clearExpiration = () => {
    setDateValue('');
    setTimeValue('');
    setLocalError(null);
    onChange('');
  };

  const displayedError = localError ?? error;
  const inputStyle = {
    backgroundColor: BrandColors.controlSurface,
    border: 'none',
    color: BrandColors.text,
    colorScheme: 'light dark',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    height: 44,
    outline: 'none',
    padding: '0 12px',
    width: '100%',
  } as const;

  return (
    <View style={styles.fieldGroup}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Expiration Date &amp; Time</Text>
        {dateValue || timeValue ? (
          <Pressable accessibilityRole="button" onPress={clearExpiration}>
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={[styles.inputRow, displayedError && styles.inputRowError]}>
        <View style={styles.inputColumn}>
          <Text style={styles.inputLabel}>Date</Text>
          {createElement('input', {
            'aria-label': 'Expiration date',
            min: localDateValue(new Date()),
            onChange: (event: { currentTarget: { value: string } }) => {
              const nextDate = event.currentTarget.value;
              setDateValue(nextDate);
              updateValue(nextDate, timeValue);
            },
            style: inputStyle,
            type: 'date',
            value: dateValue,
          })}
        </View>

        <View style={styles.inputColumn}>
          <Text style={styles.inputLabel}>Time</Text>
          {createElement('input', {
            'aria-label': 'Expiration time',
            onChange: (event: { currentTarget: { value: string } }) => {
              const nextTime = event.currentTarget.value;
              setTimeValue(nextTime);
              updateValue(dateValue, nextTime);
            },
            style: inputStyle,
            type: 'time',
            value: timeValue,
          })}
        </View>
      </View>

      {!dateValue && !timeValue ? (
        <Text style={styles.emptyText}>No expiration selected</Text>
      ) : null}
      {displayedError ? <Text style={styles.errorText}>{displayedError}</Text> : null}
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
  inputRow: {
    borderColor: BrandColors.border,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    overflow: 'hidden',
    padding: 8,
  },
  inputRowError: {
    borderColor: BrandColors.red,
  },
  inputColumn: {
    backgroundColor: BrandColors.controlSurface,
    borderColor: BrandColors.border,
    borderRadius: 6,
    borderWidth: 1,
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
  },
  inputLabel: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 12,
    paddingTop: 7,
  },
  emptyText: {
    color: BrandColors.muted,
    fontSize: 12,
  },
  errorText: {
    color: BrandColors.red,
    fontSize: 12,
    fontWeight: '600',
  },
});
