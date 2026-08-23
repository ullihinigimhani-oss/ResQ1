import { createElement, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { BrandColors } from '@/constants/brand';
import { isAlertApiError, searchSchoolsByArea } from '@/services/alertService';
import {
  alertAudiences,
  type AlertAudience,
  type School,
  type SchoolSearchResult,
  type SchoolSelectionPayload,
} from '@/types/alert';

const audienceLabels: Record<AlertAudience, string> = {
  ALL: 'All',
  GENERAL_PUBLIC: 'General Public',
  SCHOOL_EMERGENCY: 'School Emergency',
};

type SchoolOption = SchoolSearchResult;

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

function schoolToOption(school: School | SchoolSelectionPayload): SchoolOption | null {
  const schoolName = school.schoolName?.trim();

  if (!schoolName) {
    return null;
  }

  return {
    id: school.id ?? null,
    schoolName,
    area: school.area?.trim() ?? '',
    latitude: school.latitude ?? null,
    longitude: school.longitude ?? null,
    osmId: school.osmId ?? null,
    osmType: school.osmType ?? null,
    formattedAddress: school.formattedAddress ?? null,
  };
}

function schoolToPayload(school: SchoolOption): SchoolSelectionPayload {
  return {
    id: school.id,
    schoolName: school.schoolName,
    area: school.area,
    latitude: school.latitude,
    longitude: school.longitude,
    osmId: school.osmId,
    osmType: school.osmType,
    formattedAddress: school.formattedAddress,
  };
}

function schoolKey(school: SchoolOption | SchoolSelectionPayload) {
  if (school.osmId && school.osmType) {
    return `osm:${school.osmType.toLowerCase()}:${school.osmId.toLowerCase()}`;
  }

  if (school.id) {
    return `db:${school.id}`;
  }

  return [
    school.schoolName?.toLowerCase().trim() ?? '',
    school.area?.toLowerCase().trim() ?? '',
    school.latitude ?? '',
    school.longitude ?? '',
  ].join('|');
}

function mergeSchoolOptions(
  selectedSchools: SchoolSelectionPayload[],
  searchResults: SchoolOption[],
) {
  const merged = new Map<string, SchoolOption>();

  for (const school of selectedSchools) {
    const option = schoolToOption(school);

    if (option) {
      merged.set(schoolKey(option), option);
    }
  }

  for (const school of searchResults) {
    merged.set(schoolKey(school), school);
  }

  return [...merged.values()];
}

function buildOsmEmbedUrl(schools: SchoolOption[]) {
  const coordinateSchools = schools.filter((school) => school.latitude !== null && school.longitude !== null);

  if (coordinateSchools.length === 0) {
    return null;
  }

  const firstSchool = coordinateSchools[0];
  const latitudes = coordinateSchools.map((school) => school.latitude as number);
  const longitudes = coordinateSchools.map((school) => school.longitude as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const padding = 0.015;
  const bbox = [
    minLng - padding,
    minLat - padding,
    maxLng + padding,
    maxLat + padding,
  ].join(',');
  const marker = `${firstSchool.latitude},${firstSchool.longitude}`;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(marker)}`;
}

function markerPositions(schools: SchoolOption[]) {
  const coordinateSchools = schools.filter((school) => school.latitude !== null && school.longitude !== null);
  const latitudes = coordinateSchools.map((school) => school.latitude as number);
  const longitudes = coordinateSchools.map((school) => school.longitude as number);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = maxLat - minLat || 1;
  const lngRange = maxLng - minLng || 1;

  return coordinateSchools.map((school, index) => ({
    key: schoolKey(school),
    label: String(index + 1),
    school,
    x: 10 + (((school.longitude as number) - minLng) / lngRange) * 80,
    y: 12 + (1 - (((school.latitude as number) - minLat) / latRange)) * 76,
  }));
}

function SchoolMapPreview({
  onToggleSchool,
  schools,
  selectedKeys,
}: {
  onToggleSchool: (school: SchoolOption) => void;
  schools: SchoolOption[];
  selectedKeys: Set<string>;
}) {
  const [mapFailed, setMapFailed] = useState(false);
  const coordinateSchools = schools.filter((school) => school.latitude !== null && school.longitude !== null);
  const mapUrl = useMemo(() => buildOsmEmbedUrl(coordinateSchools), [coordinateSchools]);
  const markers = useMemo(() => markerPositions(coordinateSchools), [coordinateSchools]);

  useEffect(() => {
    setMapFailed(false);
  }, [mapUrl]);

  if (coordinateSchools.length === 0) {
    return (
      <View style={styles.mapFallback}>
        <Text style={styles.mapTitle}>OpenStreetMap</Text>
        <Text style={styles.mapBody}>No coordinates were returned for these schools.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapShell}>
      <View style={styles.mapCanvas}>
        {Platform.OS === 'web' && mapUrl && !mapFailed ? createElement('iframe', {
          loading: 'lazy',
          onError: () => setMapFailed(true),
          src: mapUrl,
          style: {
            border: 0,
            height: '100%',
            left: 0,
            position: 'absolute',
            top: 0,
            width: '100%',
          },
          title: 'OpenStreetMap school locations',
        }) : (
          <View style={styles.nativeMapFallback}>
            <Text style={styles.mapTitle}>OpenStreetMap</Text>
            <Text style={styles.mapBody}>
              {mapFailed
                ? 'Map unavailable. School list is still available.'
                : 'Map tiles are available on web. School markers remain selectable here.'}
            </Text>
          </View>
        )}
        <View style={styles.mapOverlay} />
        {markers.map((marker) => {
          const selected = selectedKeys.has(marker.key);

          return (
            <Pressable
              accessibilityLabel={`Select ${marker.school.schoolName}`}
              accessibilityRole="button"
              key={marker.key}
              onPress={() => onToggleSchool(marker.school)}
              style={({ pressed }) => [
                styles.mapMarker,
                selected && styles.mapMarkerSelected,
                {
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                },
                pressed && styles.pressed,
              ]}>
              <Text style={[styles.mapMarkerText, selected && styles.mapMarkerTextSelected]}>
                {marker.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SchoolRow({
  onToggle,
  school,
  selected,
}: {
  onToggle: () => void;
  school: SchoolOption;
  selected: boolean;
}) {
  const address = school.formattedAddress || school.area;

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
        <Text style={styles.schoolMeta}>{address}</Text>
      </View>
    </Pressable>
  );
}

export function SchoolTargetingSection({
  affectedArea,
  error,
  onSelectedSchoolsChange,
  selectedSchools,
  token,
}: {
  affectedArea: string;
  error?: string;
  onSelectedSchoolsChange: (schools: SchoolSelectionPayload[]) => void;
  selectedSchools: SchoolSelectionPayload[];
  token: string | null;
}) {
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [searchedArea, setSearchedArea] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const area = affectedArea.trim();
  const selectedKeys = useMemo(
    () => new Set(selectedSchools.map((school) => schoolKey(school))),
    [selectedSchools],
  );
  const displayedSchools = useMemo(
    () => mergeSchoolOptions(selectedSchools, schools),
    [schools, selectedSchools],
  );

  const findSchools = async () => {
    if (!token) {
      setLoadError('Please log in before searching schools.');
      return;
    }

    if (!area) {
      setLoadError('Enter an affected area before searching schools.');
      return;
    }

    setLoadingSchools(true);
    setLoadError(null);

    try {
      const schoolResults = await searchSchoolsByArea(area, token);
      setSchools(schoolResults);
      setSearchedArea(area);
    } catch (fetchError) {
      if (__DEV__ && !isAlertApiError(fetchError)) {
        console.warn('Unexpected OSM school lookup error:', fetchError);
      }

      setSchools([]);
      setSearchedArea(area);
      setLoadError(
        isAlertApiError(fetchError)
          ? fetchError.message
          : 'Unable to load school locations. Please try again.',
      );
    } finally {
      setLoadingSchools(false);
    }
  };

  const toggleSchool = (school: SchoolOption) => {
    const key = schoolKey(school);

    if (selectedKeys.has(key)) {
      onSelectedSchoolsChange(selectedSchools.filter((selectedSchool) => schoolKey(selectedSchool) !== key));
      return;
    }

    onSelectedSchoolsChange([...selectedSchools, schoolToPayload(school)]);
  };

  const selectAllDisplayedSchools = () => {
    onSelectedSchoolsChange(displayedSchools.map(schoolToPayload));
  };

  return (
    <View style={styles.targetingShell}>
      <View style={styles.targetingHeader}>
        <Text style={styles.targetingTitle}>School Targeting</Text>
        <Text style={styles.targetingBody}>
          Find real schools with OpenStreetMap data, then choose one or more target schools.
        </Text>
      </View>

      <View style={styles.findRow}>
        <Pressable
          accessibilityRole="button"
          disabled={loadingSchools}
          onPress={() => void findSchools()}
          style={({ pressed }) => [
            styles.findButton,
            loadingSchools && styles.findButtonDisabled,
            pressed && !loadingSchools && styles.pressed,
          ]}>
          {loadingSchools ? (
            <ActivityIndicator color={BrandColors.white} />
          ) : (
            <Text style={styles.findButtonText}>Find Schools</Text>
          )}
        </Pressable>
        <Text style={styles.selectedCount}>Selected Schools: {selectedSchools.length}</Text>
      </View>

      {!area ? (
        <Text style={styles.stateText}>Enter an affected area such as Colombo before searching.</Text>
      ) : null}

      {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

      {!loadingSchools && searchedArea && schools.length === 0 && !loadError ? (
        <Text style={styles.stateText}>No schools found for this area.</Text>
      ) : null}

      {displayedSchools.length > 0 ? (
        <>
          <SchoolMapPreview
            onToggleSchool={toggleSchool}
            schools={displayedSchools}
            selectedKeys={selectedKeys}
          />

          <View style={styles.schoolActions}>
            <Pressable
              accessibilityRole="button"
              onPress={selectAllDisplayedSchools}
              style={({ pressed }) => [styles.selectAllButton, pressed && styles.pressed]}>
              <Text style={styles.selectAllText}>Select All Displayed Schools</Text>
            </Pressable>
          </View>

          <View style={[styles.schoolList, error && styles.selectorError]}>
            {displayedSchools.map((school) => (
              <SchoolRow
                key={schoolKey(school)}
                onToggle={() => toggleSchool(school)}
                school={school}
                selected={selectedKeys.has(schoolKey(school))}
              />
            ))}
          </View>
        </>
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
  findRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  findButton: {
    alignItems: 'center',
    backgroundColor: BrandColors.red,
    borderColor: BrandColors.red,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 128,
    paddingHorizontal: 14,
  },
  findButtonDisabled: {
    opacity: 0.58,
  },
  findButtonText: {
    color: BrandColors.white,
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  selectedCount: {
    color: BrandColors.navy,
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 16,
  },
  mapShell: {
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 174,
    overflow: 'hidden',
  },
  mapCanvas: {
    backgroundColor: BrandColors.lightBlue,
    minHeight: 174,
    overflow: 'hidden',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 26, 53, 0.04)',
  },
  nativeMapFallback: {
    ...StyleSheet.absoluteFillObject,
    gap: 4,
    justifyContent: 'center',
    padding: 14,
  },
  mapFallback: {
    backgroundColor: BrandColors.lightBlue,
    borderColor: BrandColors.sky,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    minHeight: 132,
    justifyContent: 'center',
    padding: 14,
  },
  mapTitle: {
    color: BrandColors.navy,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  mapBody: {
    color: BrandColors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  mapMarker: {
    alignItems: 'center',
    backgroundColor: BrandColors.deepBlue,
    borderColor: BrandColors.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -14,
    position: 'absolute',
    width: 28,
  },
  mapMarkerSelected: {
    backgroundColor: BrandColors.red,
    height: 34,
    marginLeft: -17,
    marginTop: -17,
    width: 34,
  },
  mapMarkerText: {
    color: BrandColors.white,
    fontSize: 11,
    fontWeight: '900',
    lineHeight: 14,
  },
  mapMarkerTextSelected: {
    fontSize: 12,
    lineHeight: 15,
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
