import { sql } from '../config/database.js';
import type {
  CreateEmergencyContactPayload,
  EmergencyContact,
  EmergencyContactFieldErrors,
  UpdateEmergencyContactPayload,
} from '../types/emergencyContact.js';

export class EmergencyContactServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: EmergencyContactFieldErrors,
  ) {
    super(message);
    this.name = 'EmergencyContactServiceError';
  }
}

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

function trimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateEmergencyContactInput(
  input: CreateEmergencyContactPayload,
  isUpdate = false,
) {
  const fieldErrors: EmergencyContactFieldErrors = {};

  const name = trimmedText(input.name);
  const phoneNumber = trimmedText(input.phoneNumber);
  const relationship = trimmedText(input.relationship);
  const notes = trimmedText(input.notes);
  const isPrimary = Boolean(input.isPrimary);

  if (!isUpdate || input.name !== undefined) {
    if (!name) {
      fieldErrors.name = 'Contact name is required.';
    } else if (name.length < 2) {
      fieldErrors.name = 'Contact name must be at least 2 characters.';
    }
  }

  if (!isUpdate || input.phoneNumber !== undefined) {
    if (!phoneNumber) {
      fieldErrors.phoneNumber = 'Contact phone number is required.';
    } else if (!PHONE_REGEX.test(phoneNumber)) {
      fieldErrors.phoneNumber = 'Enter a valid phone number (e.g. 0771234567).';
    }
  }

  if (!isUpdate || input.relationship !== undefined) {
    if (!relationship) {
      fieldErrors.relationship = 'Relationship is required.';
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new EmergencyContactServiceError(
      400,
      'Please correct the errors before submitting.',
      fieldErrors,
    );
  }

  return {
    name,
    phoneNumber,
    relationship,
    isPrimary,
    notes: notes || null,
  };
}

function formatContactRow(row: any): EmergencyContact {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    phoneNumber: row.phone_number,
    relationship: row.relationship,
    isPrimary: Boolean(row.is_primary),
    notes: row.notes || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listEmergencyContactsByUserId(userId: number): Promise<EmergencyContact[]> {
  const contacts = await sql`
    SELECT id, user_id, name, phone_number, relationship, is_primary, notes, created_at, updated_at
    FROM emergency_contacts
    WHERE user_id = ${userId}
    ORDER BY is_primary DESC, created_at ASC
  `;

  return contacts.map(formatContactRow);
}

export async function getEmergencyContactById(
  userId: number,
  contactId: number,
): Promise<EmergencyContact> {
  const rows = await sql`
    SELECT id, user_id, name, phone_number, relationship, is_primary, notes, created_at, updated_at
    FROM emergency_contacts
    WHERE id = ${contactId}
    LIMIT 1
  `;

  const contact = rows[0];

  if (!contact) {
    throw new EmergencyContactServiceError(404, 'Emergency contact not found.');
  }

  if (contact.user_id !== userId) {
    throw new EmergencyContactServiceError(
      403,
      'You are not authorized to access this emergency contact.',
    );
  }

  return formatContactRow(contact);
}

export async function createEmergencyContact(
  userId: number,
  payload: CreateEmergencyContactPayload,
): Promise<EmergencyContact> {
  const validated = validateEmergencyContactInput(payload, false);

  // If set as primary contact, unmark any previous primary contact for this user
  if (validated.isPrimary) {
    await sql`
      UPDATE emergency_contacts
      SET is_primary = FALSE
      WHERE user_id = ${userId}
    `;
  } else {
    // If user has no existing contacts, automatically make this first contact primary
    const existingCount = await sql`
      SELECT COUNT(*) AS count
      FROM emergency_contacts
      WHERE user_id = ${userId}
    `;
    if (Number(existingCount[0]?.count || 0) === 0) {
      validated.isPrimary = true;
    }
  }

  const rows = await sql`
    INSERT INTO emergency_contacts (
      user_id,
      name,
      phone_number,
      relationship,
      is_primary,
      notes
    )
    VALUES (
      ${userId},
      ${validated.name},
      ${validated.phoneNumber},
      ${validated.relationship},
      ${validated.isPrimary},
      ${validated.notes}
    )
    RETURNING id, user_id, name, phone_number, relationship, is_primary, notes, created_at, updated_at
  `;

  const created = rows[0];

  if (!created) {
    throw new EmergencyContactServiceError(500, 'Failed to create emergency contact.');
  }

  return formatContactRow(created);
}

export async function updateEmergencyContact(
  userId: number,
  contactId: number,
  payload: UpdateEmergencyContactPayload,
): Promise<EmergencyContact> {
  const existingRows = await sql`
    SELECT id, user_id, name, phone_number, relationship, is_primary, notes
    FROM emergency_contacts
    WHERE id = ${contactId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    throw new EmergencyContactServiceError(404, 'Emergency contact not found.');
  }

  if (existing.user_id !== userId) {
    throw new EmergencyContactServiceError(
      403,
      'You are not authorized to update this emergency contact.',
    );
  }

  const mergedPayload: CreateEmergencyContactPayload = {
    name: payload.name !== undefined ? payload.name : existing.name,
    phoneNumber: payload.phoneNumber !== undefined ? payload.phoneNumber : existing.phone_number,
    relationship: payload.relationship !== undefined ? payload.relationship : existing.relationship,
    isPrimary: payload.isPrimary !== undefined ? payload.isPrimary : existing.is_primary,
    notes: payload.notes !== undefined ? payload.notes : existing.notes,
  };

  const validated = validateEmergencyContactInput(mergedPayload, true);

  if (validated.isPrimary && !existing.is_primary) {
    await sql`
      UPDATE emergency_contacts
      SET is_primary = FALSE
      WHERE user_id = ${userId}
    `;
  }

  const updatedRows = await sql`
    UPDATE emergency_contacts
    SET
      name = ${validated.name},
      phone_number = ${validated.phoneNumber},
      relationship = ${validated.relationship},
      is_primary = ${validated.isPrimary},
      notes = ${validated.notes},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${contactId}
    RETURNING id, user_id, name, phone_number, relationship, is_primary, notes, created_at, updated_at
  `;

  const updated = updatedRows[0];

  return formatContactRow(updated);
}

export async function deleteEmergencyContact(
  userId: number,
  contactId: number,
): Promise<{ success: boolean; message: string }> {
  const rows = await sql`
    SELECT user_id, is_primary
    FROM emergency_contacts
    WHERE id = ${contactId}
    LIMIT 1
  `;

  const existing = rows[0];

  if (!existing) {
    throw new EmergencyContactServiceError(404, 'Emergency contact not found.');
  }

  if (existing.user_id !== userId) {
    throw new EmergencyContactServiceError(
      403,
      'You are not authorized to remove this emergency contact.',
    );
  }

  await sql`
    DELETE FROM emergency_contacts
    WHERE id = ${contactId}
  `;

  // If deleted contact was primary, promote the next oldest contact to primary
  if (existing.is_primary) {
    const nextContact = await sql`
      SELECT id FROM emergency_contacts
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
      LIMIT 1
    `;

    if (nextContact[0]?.id) {
      await sql`
        UPDATE emergency_contacts
        SET is_primary = TRUE
        WHERE id = ${nextContact[0].id}
      `;
    }
  }

  return {
    success: true,
    message: 'Emergency contact removed successfully.',
  };
}
