import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandColors } from '@/constants/brand';
import { getSchoolsByArea, isAlertApiError } from '@/services/alertService';
import { alertAudiences, type AlertAudience, type School } from '@/types/alert';

const audienceLabels: Record<AlertAudience, string> = {
  ALL: 'All',
  GENERAL_PUBLIC: 'General Public',
  SCHOOL_EMERGENCY: 'School Emergency',
};

export function audienceLabel(audience: AlertAudience) {
  return audienceLabels[audience];
}

export function AudienceSelector({
  error,
  onChange,
  value,
}: {
  error?: string;
  onChange: (audience: AlertAudience) => void;
  value: AlertAudience;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>Alert Audience</Text>
      <View style={[styles.optionGrid, error && styles.selectorError]}>
        {alertAudiences.map((audience) => {
          const selected = value === audience;

          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={audience}
              onPress={() => onChange(audience)}
              style={({ pressed }) => [
                styles.optionButton,
                selected && styles.optionButtonSelected,
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.optionButtonText, selected && styles.optionButtonTextSelected]}>
                {audienceLabels[audience]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function SchoolRow({
  onToggle,
  school,
  selected,
}: {
  onToggle: () => void;
  school: School;
  selected: boolean;
}) {
  const coordinates = school.latitude !== null && school.longitude !== null
    ? `${school.latitude.toFixed(6)}, ${school.longitude.toFixed(6)}`
    : 'Coordinates not available';

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onToggle}
      style={({ pressed }) => [
        styles.schoolRow,
        selected && styles.schoolRowSelected,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.checkBox, selected && styles.checkBoxSelected]}>
        <Text style={[styles.checkText, selected && styles.checkTextSelected]}>{selected ? 'X' : ''}</Text>
      </View>
      <View style={styles.schoolTextBlock}>
        <Text style={styles.schoolName}>{school.schoolName}</Text>
        <Text style={styles.schoolMeta}>{school.area}</Text>
        <Text style={styles.schoolCoordinates}>{coordinates}</Text>
      </View>
    </Pressable>
  );
}

export function SchoolTargetingSection({
  affectedArea,
  error,
  onSelectedSchoolIdsChange,
  selectedSchoolIds,
  token,
}: {
  affectedArea: string;
  error?: string;
  onSelectedSchoolIdsChange: (schoolIds: number[]) => void;
  selectedSchoolIds: number[];
  token: string | null;
}) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const area = affectedArea.trim();
  const selectedIds = useMemo(() => new Set(selectedSchoolIds), [selectedSchoolIds]);
  const schoolsWithCoordinates = schools.filter((school) => school.latitude !== null && school.longitude !== null);

  useEffect(() => {
    if (!token || !area) {
      setSchools([]);
      setLoadError(null);
      setLoadingSchools(false);
      return;
    }

    let isActive = true;

    setLoadingSchools(true);
    setLoadError(null);

    getSchoolsByArea(area, token)
      .then((schoolList) => {
        if (isActive) {
          setSchools(schoolList);
        }
      })
      .catch((fetchError) => {
        if (__DEV__ && !isAlertApiError(fetchError)) {
          console.warn('Unexpected school lookup error:', fetchError);
        }

        if (isActive) {
          setSchools([]);
          setLoadError('Unable to load schools for this area.');
        }
      })
      .finally(() => {
        if (isActive) {
          setLoadingSchools(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [area, token]);

  const toggleSchool = (schoolId: number) => {
    if (selectedIds.has(schoolId)) {
      onSelectedSchoolIdsChange(selectedSchoolIds.filter((id) => id !== schoolId));
      return;
    }

    onSelectedSchoolIdsChange([...selectedSchoolIds, schoolId]);
  };

  const selectAllSchools = () => {
    onSelectedSchoolIdsChange(schools.map((school) => school.id));
  };

  return (
    <View style={styles.targetingShell}>
      <View style={styles.targetingHeader}>
        <Text style={styles.targetingTitle}>School Targeting</Text>
        <Text style={styles.targetingBody}>Uses database-backed schools in the selected affected area.</Text>
      </View>

      <View style={styles.mapShell}>
        <View style={styles.mapLine} />
        <View style={styles.mapPoint} />
        <View style={[styles.mapPoint, styles.mapPointEnd]} />
        <Text style={styles.mapTitle}>School map-ready view</Text>
        <Text style={styles.mapBody}>
          {schoolsWithCoordinates.length > 0
            ? `${schoolsWithCoordinates.length} school location(s) have coordinates.`
            : 'School coordinates must be added to the schools table before map pins can be shown.'}
        </Text>
      </View>

      {!area ? (
        <Text style={styles.stateText}>Enter an affected area to load schools.</Text>
      ) : null}

      {loadingSchools ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={BrandColors.red} />
          <Text style={styles.stateText}>Loading schools...</Text>
        </View>
      ) : null}

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!loadingSchools && area && schools.length === 0 && !loadError ? (
        <Text style={styles.stateText}>No schools are available for the selected area.</Text>
      ) : null}

      {schools.length > 0 ? (
        <View style={styles.schoolActions}>
          <Pressable
            accessibilityRole="button"
            onPress={selectAllSchools}
            style={({ pressed }) => [styles.selectAllButton, pressed && styles.pressed]}>
            <Text style={styles.selectAllText}>Select All Schools in Area</Text>
          </Pressable>
          <Text style={styles.selectedCount}>{selectedSchoolIds.length} selected</Text>
        </View>
      ) : null}

      {schools.length > 0 ? (
        <View style={[styles.schoolList, error && styles.selectorError]}>
          {schools.map((school) => (
            <SchoolRow
              key={school.id}
              onToggle={() => toggleSchool(school.id)}
              school={school}
              selected={selectedIds.has(school.id)}
            />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
  optionGrid: {
    backgroundColor: BrandColors.white,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 8,
  },
  optionButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: '30%',
    paddingHorizontal: 8,
  },
  optionButtonSelected: {
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.deepBlue,
  },
  optionButtonText: {
    color: BrandColors.deepBlue,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  optionButtonTextSelected: {
    color: BrandColors.white,
  },
  targetingShell: {
    gap: 12,
  },
  targetingHeader: {
    gap: 4,
  },
  targetingTitle: {
    color: BrandColors.navy,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 22,
  },
  targetingBody: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
  mapShell: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minHeight: 112,
    overflow: 'hidden',
    padding: 14,
  },
  mapLine: {
    backgroundColor: BrandColors.sky,
    height: 3,
    left: 28,
    position: 'absolute',
    right: 28,
    top: 34,
  },
  mapPoint: {
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.white,
    borderRadius: 999,
    borderWidth: 3,
    height: 18,
    left: 24,
    position: 'absolute',
    top: 26,
    width: 18,
  },
  mapPointEnd: {
    backgroundColor: BrandColors.red,
    left: undefined,
    right: 24,
  },
  mapTitle: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
    marginTop: 36,
  },
  mapBody: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  schoolActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  selectAllButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.navy,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: 12,
  },
  selectAllText: {
    color: BrandColors.white,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  selectedCount: {
    color: BrandColors.muted,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  schoolList: {
    borderColor: BrandColors.border,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  schoolRow: {
    alignItems: 'flex-start',
    backgroundColor: BrandColors.white,
    borderBottomColor: BrandColors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  schoolRowSelected: {
    backgroundColor: BrandColors.lightBlue,
  },
  checkBox: {
    alignItems: 'center',
    borderColor: BrandColors.border,
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    marginTop: 1,
    width: 24,
  },
  checkBoxSelected: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  checkText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 16,
  },
  checkTextSelected: {
    color: BrandColors.white,
  },
  schoolTextBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  schoolName: {
    color: BrandColors.navy,
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 19,
  },
  schoolMeta: {
    color: BrandColors.text,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 17,
  },
  schoolCoordinates: {
    color: BrandColors.muted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 15,
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  stateText: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  selectorError: {
    backgroundColor: BrandColors.redSoft,
    borderColor: BrandColors.red,
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
