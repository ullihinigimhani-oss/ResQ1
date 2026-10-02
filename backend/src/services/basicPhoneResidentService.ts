import { sql } from '../config/database.js';
import type {
  BasicPhoneResident,
  BasicPhoneResidentFieldErrors,
  BasicPhoneResidentInput,
  BasicPhoneResidentRow,
} from '../types/basicPhoneResident.js';

export class BasicPhoneResidentServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: BasicPhoneResidentFieldErrors,
  ) {
    super(message);
    this.name = 'BasicPhoneResidentServiceError';
  }
}

const SRI_LANKAN_MOBILE_PATTERN = /^07\d{8}$/;
let basicPhoneResidentSchemaReady: Promise<void> | null = null;

function trimmedText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeSriLankanMobileNumber(value: unknown) {
  return trimmedText(value).replace(/[\s-]+/g, '');
}

function formatTimestamp(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toBasicPhoneResident(row: BasicPhoneResidentRow): BasicPhoneResident {
  return {
    id: row.id,
    fullName: row.full_name,
    mobileNumber: row.phone_number,
    area: row.area,
    registeredBy: row.registered_by,
    createdAt: formatTimestamp(row.created_at),
    updatedAt: formatTimestamp(row.updated_at),
  };
}

function databaseErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null;
  }

  return String(error.code);
}

function validateInput(input: BasicPhoneResidentInput) {
  const fullName = trimmedText(input.fullName);
  const mobileNumber = normalizeSriLankanMobileNumber(input.mobileNumber);
  const area = trimmedText(input.area);
  const fieldErrors: BasicPhoneResidentFieldErrors = {};

  if (!fullName) {
    fieldErrors.fullName = 'Full name is required.';
  } else if (fullName.length < 2) {
    fieldErrors.fullName = 'Full name must be at least 2 characters.';
  } else if (fullName.length > 100) {
    fieldErrors.fullName = 'Full name must be 100 characters or fewer.';
  }

  if (!mobileNumber) {
    fieldErrors.mobileNumber = 'Mobile number is required.';
  } else if (!SRI_LANKAN_MOBILE_PATTERN.test(mobileNumber)) {
    fieldErrors.mobileNumber = 'Enter a valid Sri Lankan mobile number.';
  }

  if (!area) {
    fieldErrors.area = 'Area is required.';
  } else if (area.length > 150) {
    fieldErrors.area = 'Area must be 150 characters or fewer.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new BasicPhoneResidentServiceError(
      400,
      'Please correct the highlighted fields.',
      fieldErrors,
    );
  }

  return { fullName, mobileNumber, area };
}

function duplicatePhoneError() {
  return new BasicPhoneResidentServiceError(
    409,
    'This mobile number is already registered.',
    { mobileNumber: 'This mobile number is already registered.' },
  );
}

export async function ensureBasicPhoneResidentSchema() {
  basicPhoneResidentSchemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS basic_phone_residents (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        phone_number VARCHAR(10) NOT NULL,
        area VARCHAR(150) NOT NULL,
        registered_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_basic_phone_residents_registered_by
      ON basic_phone_residents(registered_by)
    `;

    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_basic_phone_residents_phone_number
      ON basic_phone_residents(phone_number)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_basic_phone_residents_area
      ON basic_phone_residents(LOWER(TRIM(area)))
    `;
  })();

  await basicPhoneResidentSchemaReady;
}

export async function listBasicPhoneResidents(registeredBy: number) {
  await ensureBasicPhoneResidentSchema();

  const rows = await sql`
    SELECT id, full_name, phone_number, area, registered_by, created_at, updated_at
    FROM basic_phone_residents
    WHERE registered_by = ${registeredBy}
    ORDER BY LOWER(full_name) ASC, created_at DESC
  `;

  return (rows as BasicPhoneResidentRow[]).map(toBasicPhoneResident);
}

export async function getBasicPhoneResident(registeredBy: number, residentId: number) {
  await ensureBasicPhoneResidentSchema();

  const rows = await sql`
    SELECT id, full_name, phone_number, area, registered_by, created_at, updated_at
    FROM basic_phone_residents
    WHERE id = ${residentId}
    LIMIT 1
  `;
  const resident = rows[0] as BasicPhoneResidentRow | undefined;

  if (!resident) {
    throw new BasicPhoneResidentServiceError(404, 'Basic phone resident not found.');
  }

  if (resident.registered_by !== registeredBy) {
    throw new BasicPhoneResidentServiceError(
      403,
      'You are not authorized to manage this basic phone resident.',
    );
  }

  return toBasicPhoneResident(resident);
}

export async function createBasicPhoneResident(
  registeredBy: number,
  input: BasicPhoneResidentInput,
) {
  await ensureBasicPhoneResidentSchema();
  const validated = validateInput(input);

  const duplicateRows = await sql`
    SELECT id
    FROM basic_phone_residents
    WHERE phone_number = ${validated.mobileNumber}
    LIMIT 1
  `;

  if (duplicateRows[0]) {
    throw duplicatePhoneError();
  }

  try {
    const rows = await sql`
      INSERT INTO basic_phone_residents (
        full_name,
        phone_number,
        area,
        registered_by
      )
      VALUES (
        ${validated.fullName},
        ${validated.mobileNumber},
        ${validated.area},
        ${registeredBy}
      )
      RETURNING id, full_name, phone_number, area, registered_by, created_at, updated_at
    `;
    const created = rows[0] as BasicPhoneResidentRow | undefined;

    if (!created) {
      throw new BasicPhoneResidentServiceError(500, 'Unable to register this resident.');
    }

    return toBasicPhoneResident(created);
  } catch (error) {
    if (databaseErrorCode(error) === '23505') {
      throw duplicatePhoneError();
    }

    throw error;
  }
}

export async function updateBasicPhoneResident(
  registeredBy: number,
  residentId: number,
  input: BasicPhoneResidentInput,
) {
  await ensureBasicPhoneResidentSchema();
  await getBasicPhoneResident(registeredBy, residentId);
  const validated = validateInput(input);

  const duplicateRows = await sql`
    SELECT id
    FROM basic_phone_residents
    WHERE phone_number = ${validated.mobileNumber}
      AND id <> ${residentId}
    LIMIT 1
  `;

  if (duplicateRows[0]) {
    throw duplicatePhoneError();
  }

  try {
    const rows = await sql`
      UPDATE basic_phone_residents
      SET
        full_name = ${validated.fullName},
        phone_number = ${validated.mobileNumber},
        area = ${validated.area},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${residentId}
        AND registered_by = ${registeredBy}
      RETURNING id, full_name, phone_number, area, registered_by, created_at, updated_at
    `;
    const updated = rows[0] as BasicPhoneResidentRow | undefined;

    if (!updated) {
      throw new BasicPhoneResidentServiceError(404, 'Basic phone resident not found.');
    }

    return toBasicPhoneResident(updated);
  } catch (error) {
    if (databaseErrorCode(error) === '23505') {
      throw duplicatePhoneError();
    }

    throw error;
  }
}

export async function deleteBasicPhoneResident(registeredBy: number, residentId: number) {
  await ensureBasicPhoneResidentSchema();
  await getBasicPhoneResident(registeredBy, residentId);

  const rows = await sql`
    DELETE FROM basic_phone_residents
    WHERE id = ${residentId}
      AND registered_by = ${registeredBy}
    RETURNING id
  `;

  if (!rows[0]) {
    throw new BasicPhoneResidentServiceError(404, 'Basic phone resident not found.');
  }
}
