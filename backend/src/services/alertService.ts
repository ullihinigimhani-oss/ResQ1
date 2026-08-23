import { sql } from '../config/database.js';
import {
  alertAuditActions,
  alertAudiences,
  alertDisasterTypes,
  alertRiskLevels,
  alertStatuses,
  type Alert,
  type AlertAudience,
  type AlertAuditAction,
  type AlertAuditEvent,
  type AlertAuditRow,
  type AlertDisasterType,
  type AlertRiskLevel,
  type AlertRiskHistoryPoint,
  type AlertRiskHistoryRow,
  type AlertRow,
  type AlertStatus,
  type CreateAlertInput,
  type School,
  type SchoolRow,
  type SchoolSearchResult,
  type SchoolSelectionInput,
  type UpdateAlertInput,
  type ValidatedCreateAlertInput,
  type ValidatedUpdateAlertInput,
} from '../types/alert.js';

const ACTIVE_ALERT_STATUS: AlertStatus = 'Active';
const DEFAULT_ALERT_AUDIENCE: AlertAudience = 'GENERAL_PUBLIC';
const SCHOOL_ALERT_AUDIENCE: AlertAudience = 'SCHOOL_EMERGENCY';
const ALERT_TITLE_MAX_LENGTH = 150;
const ALERT_AREA_MAX_LENGTH = 150;
const SCHOOL_NAME_MAX_LENGTH = 150;
const OSM_ID_MAX_LENGTH = 80;
const OSM_TYPE_MAX_LENGTH = 20;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const OVERPASS_INTERPRETER_URL = 'https://overpass-api.de/api/interpreter';
const SCHOOL_SEARCH_CACHE_DURATION_MS = 10 * 60 * 1000;
let auditTableReady: Promise<void> | null = null;
let alertSchemaReady: Promise<void> | null = null;
const schoolSearchCache = new Map<string, { expiresAt: number; schools: SchoolSearchResult[] }>();

export class AlertServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AlertServiceError';
  }
}

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : String(value);
}

function optionalTimestamp(value: Date | string | null) {
  return value ? formatTimestamp(value) : null;
}

function optionalNumber(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== 'number' && typeof value !== 'string') {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : null;
}

function optionalText(value: unknown) {
  const text = trimmedText(value);

  return text || null;
}

function canonicalOption<T extends string>(value: string, options: readonly T[]) {
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) ?? null;
}

function toSchool(row: SchoolRow): School {
  return {
    id: row.id,
    schoolName: row.school_name,
    area: row.area,
    latitude: optionalNumber(row.latitude),
    longitude: optionalNumber(row.longitude),
    osmId: row.osm_id ?? null,
    osmType: row.osm_type ?? null,
    createdAt: formatTimestamp(row.created_at),
  };
}

function parseSchools(value: unknown) {
  if (!value) {
    return [];
  }

  let rawSchools: unknown;

  try {
    rawSchools = typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return [];
  }

  if (!Array.isArray(rawSchools)) {
    return [];
  }

  return rawSchools
    .filter((school): school is SchoolRow => Boolean(school && typeof school === 'object' && 'id' in school))
    .map(toSchool);
}

function effectiveAlertStatus(status: AlertRow['status'], expiresAt: AlertRow['expires_at']): AlertStatus {
  const canonicalStatus = canonicalOption(trimmedText(status), alertStatuses) ?? ACTIVE_ALERT_STATUS;
  const expirationTime = expiresAt ? new Date(formatTimestamp(expiresAt)).getTime() : null;

  if (
    canonicalStatus === ACTIVE_ALERT_STATUS &&
    expirationTime !== null &&
    Number.isFinite(expirationTime) &&
    expirationTime <= Date.now()
  ) {
    return 'Expired';
  }

  return canonicalStatus;
}

function toAlert(row: AlertRow): Alert {
  const alertAudience = canonicalOption(trimmedText(row.alert_audience), alertAudiences) ?? DEFAULT_ALERT_AUDIENCE;

  return {
    id: row.id,
    title: row.title,
    disasterType: row.disaster_type,
    affectedArea: row.affected_area,
    alertAudience,
    riskLevel: row.risk_level,
    message: row.message,
    safetyInstructions: row.safety_instructions ?? '',
    status: effectiveAlertStatus(row.status, row.expires_at),
    expiresAt: optionalTimestamp(row.expires_at),
    createdBy: row.created_by,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
    isRelevantToResident: Boolean(row.is_relevant_to_resident),
    schools: parseSchools(row.schools),
  };
}

type RecordAlertAuditEventInput = {
  action: AlertAuditAction;
  alertId: number;
  changedBy: number | null;
  newRiskLevel: string | null;
  newStatus: string | null;
  previousRiskLevel: string | null;
  previousStatus: string | null;
};

async function createAlertAuditTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS alert_audit_events (
      id SERIAL PRIMARY KEY,
      alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
      action VARCHAR(20) NOT NULL,
      previous_status VARCHAR(20),
      new_status VARCHAR(20),
      previous_risk_level VARCHAR(20),
      new_risk_level VARCHAR(20),
      changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_alert_audit_events_alert_id
    ON alert_audit_events(alert_id)
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_alert_audit_events_created_at
    ON alert_audit_events(created_at DESC)
  `;
}

async function ensureAlertAuditTable() {
  auditTableReady ??= createAlertAuditTable();

  await auditTableReady;
}

async function ensureAlertSchoolSchema() {
  alertSchemaReady ??= (async () => {
    await sql`ALTER TABLE alerts ADD COLUMN IF NOT EXISTS alert_audience VARCHAR(30) NOT NULL DEFAULT 'GENERAL_PUBLIC'`;

    await sql`
      CREATE TABLE IF NOT EXISTS schools (
        id SERIAL PRIMARY KEY,
        school_name VARCHAR(150) NOT NULL,
        area VARCHAR(150) NOT NULL,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        osm_id VARCHAR(80),
        osm_type VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS osm_id VARCHAR(80)`;
    await sql`ALTER TABLE schools ADD COLUMN IF NOT EXISTS osm_type VARCHAR(20)`;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_schools_area
      ON schools(area)
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_schools_osm_identity
      ON schools(osm_type, osm_id)
      WHERE osm_type IS NOT NULL AND osm_id IS NOT NULL
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS alert_schools (
        alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        PRIMARY KEY(alert_id, school_id)
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_alert_schools_school_id
      ON alert_schools(school_id)
    `;
  })();

  await alertSchemaReady;
}

function toAuditEvent(row: AlertAuditRow): AlertAuditEvent {
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action,
    title: row.title,
    disasterType: row.disaster_type,
    affectedArea: row.affected_area,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    previousRiskLevel: row.previous_risk_level,
    newRiskLevel: row.new_risk_level,
    changedBy: row.changed_by,
    createdAt: formatTimestamp(row.created_at),
  };
}

function toRiskHistoryPoint(row: AlertRiskHistoryRow): AlertRiskHistoryPoint {
  return {
    id: row.id,
    alertId: row.alert_id,
    action: row.action,
    riskLevel: row.risk_level,
    timestamp: formatTimestamp(row.created_at),
  };
}

async function getSchoolsForArea(area: string) {
  const rows = await sql`
    SELECT id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
    FROM schools
    WHERE LOWER(area) = LOWER(${area})
    ORDER BY school_name ASC
  `;

  return (rows as SchoolRow[]).map(toSchool);
}

function parseSchoolIds(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);

  return [...new Set(ids)];
}

function parseSchoolSelections(value: unknown): SchoolSelectionInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is SchoolSelectionInput => Boolean(item && typeof item === 'object'));
}

type NominatimResult = {
  boundingbox?: string[];
  display_name?: string;
  lat?: string;
  lon?: string;
};

type OverpassElement = {
  center?: {
    lat?: number;
    lon?: number;
  };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string | undefined>;
  type: string;
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

function schoolSearchUserAgent() {
  return trimmedText(process.env.RESQ1_OSM_USER_AGENT)
    || 'ResQ1/1.0 school-alert-search (local development)';
}

function schoolSearchDedupeKey(school: SchoolSearchResult) {
  if (school.osmId && school.osmType) {
    return `osm:${school.osmType.toLowerCase()}:${school.osmId.toLowerCase()}`;
  }

  return [
    school.schoolName.toLowerCase(),
    school.area.toLowerCase(),
    school.latitude ?? '',
    school.longitude ?? '',
  ].join('|');
}

function cachedSchoolSearch(area: string) {
  const cacheKey = area.toLowerCase();
  const cached = schoolSearchCache.get(cacheKey);

  if (!cached || cached.expiresAt <= Date.now()) {
    schoolSearchCache.delete(cacheKey);
    return null;
  }

  return cached.schools;
}

function setCachedSchoolSearch(area: string, schools: SchoolSearchResult[]) {
  schoolSearchCache.set(area.toLowerCase(), {
    expiresAt: Date.now() + SCHOOL_SEARCH_CACHE_DURATION_MS,
    schools,
  });
}

function fallbackBounds(latitude: number, longitude: number) {
  const latitudeDelta = 0.16;
  const longitudeDelta = 0.16;

  return {
    east: longitude + longitudeDelta,
    north: latitude + latitudeDelta,
    south: latitude - latitudeDelta,
    west: longitude - longitudeDelta,
  };
}

function boundsFromGeocode(result: NominatimResult) {
  const latitude = optionalNumber(result.lat);
  const longitude = optionalNumber(result.lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  const [southRaw, northRaw, westRaw, eastRaw] = result.boundingbox ?? [];
  const south = optionalNumber(southRaw);
  const north = optionalNumber(northRaw);
  const west = optionalNumber(westRaw);
  const east = optionalNumber(eastRaw);

  if (south !== null && north !== null && west !== null && east !== null) {
    return { east, north, south, west };
  }

  return fallbackBounds(latitude, longitude);
}

async function geocodeAreaForSchoolSearch(area: string) {
  const url = new URL(NOMINATIM_SEARCH_URL);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('q', area);

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': schoolSearchUserAgent(),
      },
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Nominatim area geocoding failed:', error);
    }

    throw new AlertServiceError(502, 'Unable to search school locations. Please try again.');
  }

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Nominatim area geocoding error:', response.status);
    }

    throw new AlertServiceError(502, 'Unable to search school locations. Please try again.');
  }

  let results: NominatimResult[] = [];

  try {
    results = await response.json() as NominatimResult[];
  } catch {
    results = [];
  }

  const result = results[0];

  if (!result) {
    return null;
  }

  return boundsFromGeocode(result);
}

function buildOverpassSchoolQuery(bounds: { east: number; north: number; south: number; west: number }) {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  return `
    [out:json][timeout:25];
    (
      node["amenity"="school"](${bbox});
      way["amenity"="school"](${bbox});
      relation["amenity"="school"](${bbox});
    );
    out center 50;
  `;
}

async function queryOverpassSchools(bounds: { east: number; north: number; south: number; west: number }) {
  let response: Response;

  try {
    response = await fetch(OVERPASS_INTERPRETER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'User-Agent': schoolSearchUserAgent(),
      },
      body: new URLSearchParams({ data: buildOverpassSchoolQuery(bounds) }).toString(),
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Overpass school search failed:', error);
    }

    throw new AlertServiceError(502, 'Unable to search school locations. Please try again.');
  }

  if (!response.ok) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Overpass school search error:', response.status);
    }

    throw new AlertServiceError(502, 'Unable to search school locations. Please try again.');
  }

  try {
    return await response.json() as OverpassResponse;
  } catch {
    throw new AlertServiceError(502, 'Unable to search school locations. Please try again.');
  }
}

function addressText(tags: Record<string, string | undefined>, fallbackArea: string) {
  return [
    tags['addr:housenumber'],
    tags['addr:street'],
    tags['addr:suburb'],
    tags['addr:city'],
    tags['addr:district'],
  ].filter(Boolean).join(', ') || fallbackArea;
}

function toSchoolSearchResult(element: OverpassElement, area: string): SchoolSearchResult | null {
  const tags = element.tags ?? {};
  const schoolName = trimmedText(tags.name ?? tags['name:en']);

  if (!schoolName) {
    return null;
  }

  const latitude = optionalNumber(element.lat ?? element.center?.lat);
  const longitude = optionalNumber(element.lon ?? element.center?.lon);

  if (latitude === null || longitude === null) {
    return null;
  }

  return {
    id: null,
    schoolName,
    area,
    latitude,
    longitude,
    osmId: String(element.id),
    osmType: element.type,
    formattedAddress: addressText(tags, area),
  };
}

async function hydrateExistingSchoolIds(results: SchoolSearchResult[]) {
  const hydrated = await Promise.all(
    results.map(async (result) => {
      if (!result.osmId || !result.osmType) {
        return result;
      }

      const rows = await sql`
        SELECT id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
        FROM schools
        WHERE osm_id = ${result.osmId}
          AND osm_type = ${result.osmType}
        LIMIT 1
      `;
      const existingSchool = (rows as SchoolRow[])[0];

      return {
        ...result,
        id: existingSchool?.id ?? null,
      };
    }),
  );

  return hydrated;
}

export async function searchSchoolsByArea(area: string) {
  await ensureAlertSchoolSchema();

  const affectedArea = trimmedText(area);

  if (!affectedArea) {
    throw new AlertServiceError(400, 'Enter an affected area before searching schools.');
  }

  const cached = cachedSchoolSearch(affectedArea);

  if (cached) {
    return cached;
  }

  const bounds = await geocodeAreaForSchoolSearch(affectedArea);

  if (!bounds) {
    setCachedSchoolSearch(affectedArea, []);
    return [];
  }

  const overpassData = await queryOverpassSchools(bounds);
  const deduped = new Map<string, SchoolSearchResult>();

  for (const element of overpassData.elements ?? []) {
    const result = toSchoolSearchResult(element, affectedArea);

    if (result) {
      deduped.set(schoolSearchDedupeKey(result), result);
    }
  }

  const schools = await hydrateExistingSchoolIds([...deduped.values()].slice(0, 50));
  setCachedSchoolSearch(affectedArea, schools);

  return schools;
}

async function getExistingSchoolById(schoolId: number) {
  const rows = await sql`
    SELECT id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
    FROM schools
    WHERE id = ${schoolId}
    LIMIT 1
  `;

  return (rows as SchoolRow[])[0] ? toSchool((rows as SchoolRow[])[0]) : null;
}

async function findExistingSchoolByNameAndArea(schoolName: string, area: string) {
  const rows = await sql`
    SELECT id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
    FROM schools
    WHERE LOWER(school_name) = LOWER(${schoolName})
      AND LOWER(area) = LOWER(${area})
    LIMIT 1
  `;

  return (rows as SchoolRow[])[0] ? toSchool((rows as SchoolRow[])[0]) : null;
}

async function findExistingSchoolByNameAndCoordinates(
  schoolName: string,
  latitude: number | null,
  longitude: number | null,
) {
  if (latitude === null || longitude === null) {
    return null;
  }

  const rows = await sql`
    SELECT id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
    FROM schools
    WHERE LOWER(school_name) = LOWER(${schoolName})
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND ABS(CAST(latitude AS DOUBLE PRECISION) - ${latitude}) < 0.0001
      AND ABS(CAST(longitude AS DOUBLE PRECISION) - ${longitude}) < 0.0001
    LIMIT 1
  `;

  return (rows as SchoolRow[])[0] ? toSchool((rows as SchoolRow[])[0]) : null;
}

async function upsertSelectedSchool(affectedArea: string, selection: SchoolSelectionInput) {
  const schoolId = Number(selection.id);

  if (Number.isInteger(schoolId) && schoolId > 0) {
    const existingSchool = await getExistingSchoolById(schoolId);

    if (!existingSchool) {
      return null;
    }

    if (existingSchool.area.toLowerCase() === affectedArea.toLowerCase() || existingSchool.osmId) {
      return existingSchool.id;
    }

    if (!trimmedText(selection.osmId)) {
      return null;
    }
  }

  const schoolName = trimmedText(selection.schoolName).slice(0, SCHOOL_NAME_MAX_LENGTH);
  const osmId = trimmedText(selection.osmId).slice(0, OSM_ID_MAX_LENGTH);
  const osmType = trimmedText(selection.osmType).slice(0, OSM_TYPE_MAX_LENGTH);
  const latitude = optionalNumber(selection.latitude);
  const longitude = optionalNumber(selection.longitude);

  if (!schoolName) {
    return null;
  }

  if (osmId && osmType) {
    const rows = await sql`
      INSERT INTO schools (school_name, area, latitude, longitude, osm_id, osm_type)
      VALUES (${schoolName}, ${affectedArea}, ${latitude}, ${longitude}, ${osmId}, ${osmType})
      ON CONFLICT (osm_type, osm_id) WHERE osm_type IS NOT NULL AND osm_id IS NOT NULL
      DO UPDATE SET
        school_name = EXCLUDED.school_name,
        area = EXCLUDED.area,
        latitude = EXCLUDED.latitude,
        longitude = EXCLUDED.longitude
      RETURNING id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
    `;
    const savedSchool = (rows as SchoolRow[])[0];

    return savedSchool?.id ?? null;
  }

  const existingSchoolByCoordinates = await findExistingSchoolByNameAndCoordinates(schoolName, latitude, longitude);

  if (existingSchoolByCoordinates) {
    return existingSchoolByCoordinates.id;
  }

  const existingSchool = await findExistingSchoolByNameAndArea(schoolName, affectedArea);

  if (existingSchool) {
    return existingSchool.id;
  }

  const rows = await sql`
    INSERT INTO schools (school_name, area, latitude, longitude)
    VALUES (${schoolName}, ${affectedArea}, ${latitude}, ${longitude})
    RETURNING id, school_name, area, latitude, longitude, osm_id, osm_type, created_at
  `;
  const savedSchool = (rows as SchoolRow[])[0];

  return savedSchool?.id ?? null;
}

async function validateSelectedSchools(
  affectedArea: string,
  alertAudience: AlertAudience,
  schoolIds: number[],
  schoolSelections: SchoolSelectionInput[],
  fieldErrors: Record<string, string>,
) {
  if (alertAudience !== SCHOOL_ALERT_AUDIENCE) {
    return [];
  }

  if (schoolIds.length === 0 && schoolSelections.length === 0) {
    fieldErrors.schoolIds = 'Select at least one school for a school emergency alert.';
    return [];
  }

  const selectedIds = await Promise.all([
    ...schoolIds.map((schoolId) => upsertSelectedSchool(affectedArea, { id: schoolId })),
    ...schoolSelections.map((school) => upsertSelectedSchool(affectedArea, school)),
  ]);
  const validSelectedIds = selectedIds.filter((schoolId): schoolId is number => Boolean(schoolId));

  if (validSelectedIds.length !== schoolIds.length + schoolSelections.length) {
    fieldErrors.schoolIds = 'Choose real schools that belong to the selected affected area.';
    return [];
  }

  return [...new Set(validSelectedIds)];
}

async function replaceAlertSchoolLinks(alertId: number, schoolIds: number[]) {
  await sql`DELETE FROM alert_schools WHERE alert_id = ${alertId}`;

  await Promise.all(
    schoolIds.map((schoolId) => sql`
      INSERT INTO alert_schools (alert_id, school_id)
      VALUES (${alertId}, ${schoolId})
      ON CONFLICT (alert_id, school_id) DO NOTHING
    `),
  );
}

function statusText(row: AlertRow) {
  return effectiveAlertStatus(row.status, row.expires_at);
}

function riskLevelText(row: AlertRow) {
  return trimmedText(row.risk_level) || null;
}

function auditActionForUpdate(
  previousAlert: AlertRow,
  updatedAlert: AlertRow,
  requestedAction: AlertAuditAction | null,
): AlertAuditAction {
  if (requestedAction) {
    return requestedAction;
  }

  const previousStatus = statusText(previousAlert);
  const newStatus = statusText(updatedAlert);

  if (previousStatus !== newStatus && newStatus === 'Expired') {
    return 'EXPIRED';
  }

  if (previousStatus !== newStatus && newStatus === 'Resolved') {
    return 'RESOLVED';
  }

  return 'UPDATED';
}

async function recordAlertAuditEvent({
  action,
  alertId,
  changedBy,
  newRiskLevel,
  newStatus,
  previousRiskLevel,
  previousStatus,
}: RecordAlertAuditEventInput) {
  await ensureAlertAuditTable();

  await sql`
    INSERT INTO alert_audit_events (
      alert_id,
      action,
      previous_status,
      new_status,
      previous_risk_level,
      new_risk_level,
      changed_by
    )
    VALUES (
      ${alertId},
      ${action},
      ${previousStatus},
      ${newStatus},
      ${previousRiskLevel},
      ${newRiskLevel},
      ${changedBy}
    )
  `;
}

function numericAlertId(alertId: string) {
  const numericValue = Number(alertId);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    throw new AlertServiceError(400, 'Invalid alert id.');
  }

  return numericValue;
}

function validateExpiresAt(value: unknown, fieldErrors: Record<string, string>) {
  const expiresAt = trimmedText(value);

  if (!expiresAt) {
    return null;
  }

  const expirationDate = new Date(expiresAt);
  const expirationTime = expirationDate.getTime();

  if (!Number.isFinite(expirationTime)) {
    fieldErrors.expiresAt = 'Expiration time must be a valid date and time.';
    return null;
  }

  if (expirationTime <= Date.now()) {
    fieldErrors.expiresAt = 'Expiration time must be in the future.';
    return null;
  }

  return expirationDate.toISOString();
}

async function validateAlertFields(
  input: CreateAlertInput,
  fieldErrors: Record<string, string>,
): Promise<ValidatedCreateAlertInput | null> {
  const title = trimmedText(input.title);
  const disasterTypeText = trimmedText(input.disasterType) || 'Flood';
  const affectedArea = trimmedText(input.affectedArea);
  const alertAudienceText = trimmedText(input.alertAudience) || DEFAULT_ALERT_AUDIENCE;
  const riskLevelText = trimmedText(input.riskLevel);
  const message = trimmedText(input.message);
  const safetyInstructions = trimmedText(input.safetyInstructions);
  const schoolIds = parseSchoolIds(input.schoolIds);
  const schoolSelections = parseSchoolSelections(input.schools);

  if (!title) {
    fieldErrors.title = 'Please enter an alert title.';
  } else if (title.length > ALERT_TITLE_MAX_LENGTH) {
    fieldErrors.title = `Alert title must be ${ALERT_TITLE_MAX_LENGTH} characters or fewer.`;
  }

  const disasterType = canonicalOption(disasterTypeText, alertDisasterTypes);

  if (!disasterType) {
    fieldErrors.disasterType = 'Disaster type must be Flood.';
  }

  if (!affectedArea) {
    fieldErrors.affectedArea = 'Please enter the affected area.';
  } else if (affectedArea.length > ALERT_AREA_MAX_LENGTH) {
    fieldErrors.affectedArea = `Affected area must be ${ALERT_AREA_MAX_LENGTH} characters or fewer.`;
  }

  const alertAudience = canonicalOption(alertAudienceText, alertAudiences);

  if (!alertAudience) {
    fieldErrors.alertAudience = 'Choose All, General Public, or School Emergency.';
  }

  const riskLevel = canonicalOption(riskLevelText, alertRiskLevels);

  if (!riskLevelText) {
    fieldErrors.riskLevel = 'Please select a risk level.';
  } else if (!riskLevel) {
    fieldErrors.riskLevel = 'Choose Low, Moderate, High, or Critical.';
  }

  if (!message) {
    fieldErrors.message = 'Please enter the warning message.';
  }

  if (!safetyInstructions) {
    fieldErrors.safetyInstructions = 'Please provide safety instructions.';
  }

  const expiresAt = validateExpiresAt(input.expiresAt, fieldErrors);

  if (alertAudience === SCHOOL_ALERT_AUDIENCE && schoolIds.length === 0 && schoolSelections.length === 0) {
    fieldErrors.schoolIds = 'Select at least one school for a school emergency alert.';
  }

  if (Object.keys(fieldErrors).length > 0 || !disasterType || !riskLevel || !alertAudience) {
    return null;
  }

  const validatedSchoolIds = await validateSelectedSchools(
    affectedArea,
    alertAudience,
    schoolIds,
    schoolSelections,
    fieldErrors,
  );

  if (Object.keys(fieldErrors).length > 0) {
    return null;
  }

  return {
    title,
    disasterType,
    affectedArea,
    alertAudience,
    riskLevel,
    message,
    safetyInstructions,
    expiresAt,
    schoolIds: validatedSchoolIds,
  };
}

async function validateCreateAlertInput(input: CreateAlertInput): Promise<ValidatedCreateAlertInput> {
  const fieldErrors: Record<string, string> = {};
  const alert = await validateAlertFields(input, fieldErrors);

  if (!alert) {
    throw new AlertServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return alert;
}

async function validateUpdateAlertInput(input: UpdateAlertInput): Promise<ValidatedUpdateAlertInput> {
  const fieldErrors: Record<string, string> = {};
  const alert = await validateAlertFields(input, fieldErrors);
  const statusText = trimmedText(input.status);
  const status = canonicalOption(statusText, alertStatuses);

  if (!statusText) {
    fieldErrors.status = 'Please select an alert status.';
  } else if (!status) {
    fieldErrors.status = 'Choose Active, Expired, or Resolved.';
  }

  if (!alert || !status) {
    throw new AlertServiceError(400, 'Please correct the highlighted fields.', fieldErrors);
  }

  return {
    ...alert,
    status,
  };
}

export async function getActiveAlerts(residentLocation: string | null | undefined) {
  await ensureAlertSchoolSchema();

  const location = trimmedText(residentLocation);

  const rows = await sql`
    WITH resident_context AS (
      SELECT ${location}::text AS resident_location
    )
    SELECT
      alerts.id,
      alerts.title,
      alerts.disaster_type,
      alerts.affected_area,
      alerts.alert_audience,
      alerts.risk_level,
      alerts.message,
      alerts.safety_instructions,
      alerts.status,
      alerts.expires_at,
      alerts.created_by,
      alerts.created_at,
      alerts.updated_at,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', schools.id,
              'school_name', schools.school_name,
              'area', schools.area,
              'latitude', schools.latitude,
              'longitude', schools.longitude,
              'osm_id', schools.osm_id,
              'osm_type', schools.osm_type,
              'created_at', schools.created_at
            )
            ORDER BY schools.school_name
          ) FILTER (WHERE schools.id IS NOT NULL),
          '[]'::json
        )
        FROM alert_schools
        INNER JOIN schools ON schools.id = alert_schools.school_id
        WHERE alert_schools.alert_id = alerts.id
      ) AS schools,
      (
        resident_context.resident_location <> ''
        AND (
          LOWER(alerts.affected_area) = LOWER(resident_context.resident_location)
          OR LOWER(alerts.affected_area) LIKE '%' || LOWER(resident_context.resident_location) || '%'
          OR LOWER(resident_context.resident_location) LIKE '%' || LOWER(alerts.affected_area) || '%'
        )
      ) AS is_relevant_to_resident
    FROM alerts
    CROSS JOIN resident_context
    WHERE alerts.status = ${ACTIVE_ALERT_STATUS}
      AND (alerts.expires_at IS NULL OR alerts.expires_at > CURRENT_TIMESTAMP)
    ORDER BY
      CASE
        WHEN (
          resident_context.resident_location <> ''
          AND (
            LOWER(alerts.affected_area) = LOWER(resident_context.resident_location)
            OR LOWER(alerts.affected_area) LIKE '%' || LOWER(resident_context.resident_location) || '%'
            OR LOWER(resident_context.resident_location) LIKE '%' || LOWER(alerts.affected_area) || '%'
          )
        )
        THEN 0
        ELSE 1
      END ASC,
      CASE alerts.risk_level
        WHEN 'Critical' THEN 1
        WHEN 'High' THEN 2
        WHEN 'Moderate' THEN 3
        WHEN 'Low' THEN 4
        ELSE 5
      END ASC,
      alerts.created_at DESC
  `;

  return (rows as AlertRow[]).map(toAlert);
}

export async function getAlertHistory() {
  await ensureAlertAuditTable();

  const rows = await sql`
    SELECT
      alert_audit_events.id,
      alert_audit_events.alert_id,
      alert_audit_events.action,
      alert_audit_events.previous_status,
      alert_audit_events.new_status,
      alert_audit_events.previous_risk_level,
      alert_audit_events.new_risk_level,
      alert_audit_events.changed_by,
      alert_audit_events.created_at,
      alerts.title,
      alerts.disaster_type,
      alerts.affected_area
    FROM alert_audit_events
    INNER JOIN alerts ON alerts.id = alert_audit_events.alert_id
    ORDER BY
      alert_audit_events.created_at DESC,
      alert_audit_events.id DESC
  `;

  return (rows as AlertAuditRow[]).map(toAuditEvent);
}

export async function getAlertRiskHistory(alertId: string) {
  await ensureAlertSchoolSchema();

  const numericId = numericAlertId(alertId);

  const alertRows = await sql`
    SELECT id
    FROM alerts
    WHERE id = ${numericId}
    LIMIT 1
  `;

  if (!alertRows[0]) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  await ensureAlertAuditTable();

  const rows = await sql`
    SELECT
      id,
      alert_id,
      action,
      new_risk_level AS risk_level,
      created_at
    FROM alert_audit_events
    WHERE alert_id = ${numericId}
      AND new_risk_level IS NOT NULL
      AND TRIM(new_risk_level) <> ''
    ORDER BY
      created_at ASC,
      id ASC
  `;

  return (rows as AlertRiskHistoryRow[]).map(toRiskHistoryPoint);
}

export async function getAlertById(alertId: string) {
  await ensureAlertSchoolSchema();

  const numericId = numericAlertId(alertId);

  const rows = await sql`
    SELECT
      id,
      title,
      disaster_type,
      affected_area,
      alert_audience,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by,
      created_at,
      updated_at,
      (
        SELECT COALESCE(
          json_agg(
            json_build_object(
              'id', schools.id,
              'school_name', schools.school_name,
              'area', schools.area,
              'latitude', schools.latitude,
              'longitude', schools.longitude,
              'osm_id', schools.osm_id,
              'osm_type', schools.osm_type,
              'created_at', schools.created_at
            )
            ORDER BY schools.school_name
          ) FILTER (WHERE schools.id IS NOT NULL),
          '[]'::json
        )
        FROM alert_schools
        INNER JOIN schools ON schools.id = alert_schools.school_id
        WHERE alert_schools.alert_id = alerts.id
      ) AS schools,
      FALSE AS is_relevant_to_resident
    FROM alerts
    WHERE id = ${numericId}
    LIMIT 1
  `;

  const alert = rows[0] as AlertRow | undefined;

  if (!alert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  return toAlert(alert);
}

export async function createAlert(senderId: number, input: CreateAlertInput) {
  await ensureAlertSchoolSchema();

  const alert = await validateCreateAlertInput(input);

  const rows = await sql`
    INSERT INTO alerts (
      title,
      disaster_type,
      affected_area,
      alert_audience,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by
    )
    VALUES (
      ${alert.title},
      ${alert.disasterType},
      ${alert.affectedArea},
      ${alert.alertAudience},
      ${alert.riskLevel},
      ${alert.message},
      ${alert.safetyInstructions},
      ${ACTIVE_ALERT_STATUS},
      ${alert.expiresAt},
      ${senderId}
    )
    RETURNING id, title, disaster_type, affected_area, alert_audience, risk_level, message, safety_instructions, status, expires_at, created_by, created_at, updated_at
  `;

  const createdAlert = rows[0] as AlertRow | undefined;

  if (!createdAlert) {
    throw new AlertServiceError(500, 'Emergency alert could not be published.');
  }

  await replaceAlertSchoolLinks(createdAlert.id, alert.schoolIds);

  await recordAlertAuditEvent({
    action: 'PUBLISHED',
    alertId: createdAlert.id,
    changedBy: senderId,
    newRiskLevel: riskLevelText(createdAlert),
    newStatus: statusText(createdAlert),
    previousRiskLevel: null,
    previousStatus: null,
  });

  return getAlertById(String(createdAlert.id));
}

export async function updateAlert(alertId: string, input: UpdateAlertInput, changedBy: number | null = null) {
  await ensureAlertSchoolSchema();

  const numericId = numericAlertId(alertId);
  const alert = await validateUpdateAlertInput(input);
  const auditActionOverride = canonicalOption(trimmedText(input.auditAction), alertAuditActions);
  const requestedAuditAction = auditActionOverride === 'PUBLISHED' ? null : auditActionOverride;

  const currentRows = await sql`
    SELECT
      id,
      title,
      disaster_type,
      affected_area,
      alert_audience,
      risk_level,
      message,
      safety_instructions,
      status,
      expires_at,
      created_by,
      created_at,
      updated_at,
      '[]'::json AS schools,
      FALSE AS is_relevant_to_resident
    FROM alerts
    WHERE id = ${numericId}
    LIMIT 1
  `;

  const previousAlert = currentRows[0] as AlertRow | undefined;

  if (!previousAlert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  const rows = await sql`
    UPDATE alerts
    SET title = ${alert.title},
        disaster_type = ${alert.disasterType},
        affected_area = ${alert.affectedArea},
        alert_audience = ${alert.alertAudience},
        risk_level = ${alert.riskLevel},
        message = ${alert.message},
        safety_instructions = ${alert.safetyInstructions},
        status = ${alert.status},
        expires_at = ${alert.expiresAt},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${numericId}
    RETURNING id, title, disaster_type, affected_area, alert_audience, risk_level, message, safety_instructions, status, expires_at, created_by, created_at, updated_at
  `;

  const updatedAlert = rows[0] as AlertRow | undefined;

  if (!updatedAlert) {
    throw new AlertServiceError(404, 'Emergency alert not found.');
  }

  await replaceAlertSchoolLinks(updatedAlert.id, alert.schoolIds);

  await recordAlertAuditEvent({
    action: auditActionForUpdate(previousAlert, updatedAlert, requestedAuditAction),
    alertId: updatedAlert.id,
    changedBy,
    newRiskLevel: riskLevelText(updatedAlert),
    newStatus: statusText(updatedAlert),
    previousRiskLevel: riskLevelText(previousAlert),
    previousStatus: statusText(previousAlert),
  });

  return getAlertById(String(updatedAlert.id));
}

export async function listSchoolsByArea(area: string) {
  await ensureAlertSchoolSchema();

  const affectedArea = trimmedText(area);

  if (!affectedArea) {
    return [];
  }

  return getSchoolsForArea(affectedArea);
}
