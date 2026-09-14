import { sql } from '../config/database.js';
import type {
  BloodGroup,
  CreateFamilyMemberPayload,
  FamilyMember,
  FamilyMemberFieldErrors,
  Gender,
  MedicalCondition,
  UpdateFamilyMemberPayload,
  VulnerabilityCategory,
} from '../types/familyMember.js';

export class FamilyMemberServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly fieldErrors?: FamilyMemberFieldErrors,
  ) {
    super(message);
    this.name = 'FamilyMemberServiceError';
  }
}

const ALLOWED_GENDERS = new Set<Gender>(['Male', 'Female', 'Other']);
const ALLOWED_BLOOD_GROUPS = new Set<BloodGroup>([
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
]);
const ALLOWED_VULNERABILITIES = new Set<VulnerabilityCategory>([
  'ELDERLY',
  'CHILDREN',
  'PREGNANT_WOMEN',
  'PERSONS_WITH_DISABILITIES',
  'PERSONS_WITH_MEDICAL_CONDITIONS',
]);
const ALLOWED_MEDICAL_CONDITIONS = new Set<MedicalCondition>([
  'DIABETES',
  'ASTHMA',
  'HEART_CONDITION',
]);

const PHONE_REGEX = /^\+?[0-9\s\-()]{7,20}$/;

function trimmedText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseAge(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 130) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number.parseInt(value.trim(), 10);
    if (parsed >= 0 && parsed <= 130) {
      return parsed;
    }
  }
  return null;
}

function sanitizeVulnerabilities(items: unknown): VulnerabilityCategory[] {
  if (!Array.isArray(items)) return [];
  const unique = new Set<VulnerabilityCategory>();
  for (const item of items) {
    if (typeof item === 'string' && ALLOWED_VULNERABILITIES.has(item as VulnerabilityCategory)) {
      unique.add(item as VulnerabilityCategory);
    }
  }
  return Array.from(unique);
}

function sanitizeMedicalConditions(items: unknown): MedicalCondition[] {
  if (!Array.isArray(items)) return [];
  const unique = new Set<MedicalCondition>();
  for (const item of items) {
    if (typeof item === 'string' && ALLOWED_MEDICAL_CONDITIONS.has(item as MedicalCondition)) {
      unique.add(item as MedicalCondition);
    }
  }
  return Array.from(unique);
}

export function validateFamilyMemberInput(
  input: CreateFamilyMemberPayload,
  isUpdate = false,
) {
  const fieldErrors: FamilyMemberFieldErrors = {};

  const name = trimmedText(input.name);
  const parsedAge = parseAge(input.age);
  const gender = trimmedText(input.gender) as Gender;
  const bloodGroup = trimmedText(input.bloodGroup) as BloodGroup;
  const phoneNumber = trimmedText(input.phoneNumber);
  const nicIdNumber = trimmedText(input.nicIdNumber);

  let vulnerableCategories = sanitizeVulnerabilities(input.vulnerableCategories);
  let medicalConditions = sanitizeMedicalConditions(input.medicalConditions);
  let disabilityDetails = trimmedText(input.disabilityDetails);

  if (!isUpdate || input.name !== undefined) {
    if (!name) {
      fieldErrors.name = 'Full name is required.';
    } else if (name.length < 2) {
      fieldErrors.name = 'Name must be at least 2 characters.';
    }
  }

  if (!isUpdate || input.age !== undefined) {
    if (parsedAge === null) {
      fieldErrors.age = 'Enter a valid non-negative age (e.g. 0 to 130).';
    }
  }

  if (!isUpdate || input.gender !== undefined) {
    if (!gender) {
      fieldErrors.gender = 'Gender selection is required.';
    } else if (!ALLOWED_GENDERS.has(gender)) {
      fieldErrors.gender = 'Select Male, Female, or Other.';
    }
  }

  if (!isUpdate || input.bloodGroup !== undefined) {
    if (!bloodGroup) {
      fieldErrors.bloodGroup = 'Blood group selection is required.';
    } else if (!ALLOWED_BLOOD_GROUPS.has(bloodGroup)) {
      fieldErrors.bloodGroup = 'Select a valid blood group (e.g. A+, O-).';
    }
  }

  if (phoneNumber && !PHONE_REGEX.test(phoneNumber)) {
    fieldErrors.phoneNumber = 'Enter a valid contact phone number.';
  }

  // NIC / ID Rule: REQUIRED if age > 18
  const ageForNic = parsedAge !== null ? parsedAge : undefined;
  if (ageForNic !== undefined && ageForNic > 18) {
    if (!nicIdNumber) {
      fieldErrors.nicIdNumber = 'NIC / ID number is required for members over 18 years old.';
    }
  }

  // Vulnerability category dependency rules:
  const hasMedicalVulnerability = vulnerableCategories.includes('PERSONS_WITH_MEDICAL_CONDITIONS');
  const hasDisabilityVulnerability = vulnerableCategories.includes('PERSONS_WITH_DISABILITIES');

  if (hasMedicalVulnerability) {
    if (medicalConditions.length === 0) {
      fieldErrors.medicalConditions =
        'Select at least one medical condition when "Persons with Medical Conditions" is selected.';
    }
  } else {
    // Clear conditions if vulnerability category is not selected to prevent contradictory data
    medicalConditions = [];
  }

  if (hasDisabilityVulnerability) {
    if (!disabilityDetails) {
      fieldErrors.disabilityDetails =
        'Disability details are required when "Persons with Disabilities" is selected.';
    }
  } else {
    // Clear disability details if vulnerability category is not selected
    disabilityDetails = '';
  }

  if (Object.keys(fieldErrors).length > 0) {
    throw new FamilyMemberServiceError(
      400,
      'Please correct the errors before submitting.',
      fieldErrors,
    );
  }

  return {
    name,
    age: parsedAge as number,
    gender,
    bloodGroup,
    phoneNumber: phoneNumber || null,
    nicIdNumber: nicIdNumber || null,
    vulnerableCategories,
    medicalConditions,
    disabilityDetails: disabilityDetails || null,
  };
}

async function fetchMemberDetails(memberId: number): Promise<{
  vulnerabilities: VulnerabilityCategory[];
  medicalConditions: MedicalCondition[];
}> {
  const [vulnRows, medRows] = await Promise.all([
    sql`
      SELECT vulnerability_type
      FROM family_member_vulnerabilities
      WHERE family_member_id = ${memberId}
      ORDER BY vulnerability_type ASC
    `,
    sql`
      SELECT medical_condition
      FROM family_member_medical_conditions
      WHERE family_member_id = ${memberId}
      ORDER BY medical_condition ASC
    `,
  ]);

  return {
    vulnerabilities: vulnRows.map((r) => r.vulnerability_type as VulnerabilityCategory),
    medicalConditions: medRows.map((r) => r.medical_condition as MedicalCondition),
  };
}

function formatMemberRow(
  row: any,
  vulnerabilities: VulnerabilityCategory[],
  medicalConditions: MedicalCondition[],
): FamilyMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    age: row.age,
    gender: row.gender as Gender,
    phoneNumber: row.phone_number || null,
    nicIdNumber: row.nic_id_number || null,
    bloodGroup: row.blood_group as BloodGroup,
    vulnerableCategories: vulnerabilities,
    medicalConditions: medicalConditions,
    disabilityDetails: row.disability_details || null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

export async function listFamilyMembersByUserId(userId: number): Promise<FamilyMember[]> {
  const members = await sql`
    SELECT id, user_id, name, age, gender, phone_number, nic_id_number, blood_group, disability_details, created_at, updated_at
    FROM family_members
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;

  if (members.length === 0) {
    return [];
  }

  const memberIds = members.map((m) => m.id);

  const [allVulns, allMeds] = await Promise.all([
    sql`
      SELECT family_member_id, vulnerability_type
      FROM family_member_vulnerabilities
      WHERE family_member_id = ANY(${memberIds})
    `,
    sql`
      SELECT family_member_id, medical_condition
      FROM family_member_medical_conditions
      WHERE family_member_id = ANY(${memberIds})
    `,
  ]);

  const vulnMap = new Map<number, VulnerabilityCategory[]>();
  for (const row of allVulns) {
    const list = vulnMap.get(row.family_member_id) || [];
    list.push(row.vulnerability_type as VulnerabilityCategory);
    vulnMap.set(row.family_member_id, list);
  }

  const medMap = new Map<number, MedicalCondition[]>();
  for (const row of allMeds) {
    const list = medMap.get(row.family_member_id) || [];
    list.push(row.medical_condition as MedicalCondition);
    medMap.set(row.family_member_id, list);
  }

  return members.map((row) =>
    formatMemberRow(row, vulnMap.get(row.id) || [], medMap.get(row.id) || []),
  );
}

export async function getFamilyMemberById(
  userId: number,
  memberId: number,
): Promise<FamilyMember> {
  const rows = await sql`
    SELECT id, user_id, name, age, gender, phone_number, nic_id_number, blood_group, disability_details, created_at, updated_at
    FROM family_members
    WHERE id = ${memberId}
    LIMIT 1
  `;

  const member = rows[0];

  if (!member) {
    throw new FamilyMemberServiceError(404, 'Family member not found.');
  }

  if (member.user_id !== userId) {
    throw new FamilyMemberServiceError(
      403,
      'You are not authorized to view family members belonging to another household.',
    );
  }

  const { vulnerabilities, medicalConditions } = await fetchMemberDetails(memberId);

  return formatMemberRow(member, vulnerabilities, medicalConditions);
}

export async function createFamilyMember(
  userId: number,
  payload: CreateFamilyMemberPayload,
): Promise<FamilyMember> {
  const validated = validateFamilyMemberInput(payload, false);

  const rows = await sql`
    INSERT INTO family_members (
      user_id,
      name,
      age,
      gender,
      phone_number,
      nic_id_number,
      blood_group,
      disability_details
    )
    VALUES (
      ${userId},
      ${validated.name},
      ${validated.age},
      ${validated.gender},
      ${validated.phoneNumber},
      ${validated.nicIdNumber},
      ${validated.bloodGroup},
      ${validated.disabilityDetails}
    )
    RETURNING id, user_id, name, age, gender, phone_number, nic_id_number, blood_group, disability_details, created_at, updated_at
  `;

  const createdMember = rows[0];

  if (!createdMember) {
    throw new FamilyMemberServiceError(500, 'Failed to create family member.');
  }

  const memberId = createdMember.id;

  // Insert vulnerabilities
  for (const category of validated.vulnerableCategories) {
    await sql`
      INSERT INTO family_member_vulnerabilities (family_member_id, vulnerability_type)
      VALUES (${memberId}, ${category})
      ON CONFLICT DO NOTHING
    `;
  }

  // Insert medical conditions
  for (const condition of validated.medicalConditions) {
    await sql`
      INSERT INTO family_member_medical_conditions (family_member_id, medical_condition)
      VALUES (${memberId}, ${condition})
      ON CONFLICT DO NOTHING
    `;
  }

  return formatMemberRow(
    createdMember,
    validated.vulnerableCategories,
    validated.medicalConditions,
  );
}

export async function updateFamilyMember(
  userId: number,
  memberId: number,
  payload: UpdateFamilyMemberPayload,
): Promise<FamilyMember> {
  const existingRows = await sql`
    SELECT id, user_id, name, age, gender, phone_number, nic_id_number, blood_group, disability_details
    FROM family_members
    WHERE id = ${memberId}
    LIMIT 1
  `;

  const existing = existingRows[0];

  if (!existing) {
    throw new FamilyMemberServiceError(404, 'Family member not found.');
  }

  if (existing.user_id !== userId) {
    throw new FamilyMemberServiceError(
      403,
      'You are not authorized to update family members belonging to another household.',
    );
  }

  const { vulnerabilities: existingVulns, medicalConditions: existingMeds } =
    await fetchMemberDetails(memberId);

  const mergedPayload: CreateFamilyMemberPayload = {
    name: payload.name !== undefined ? payload.name : existing.name,
    age: payload.age !== undefined ? payload.age : existing.age,
    gender: payload.gender !== undefined ? payload.gender : existing.gender,
    bloodGroup: payload.bloodGroup !== undefined ? payload.bloodGroup : existing.blood_group,
    phoneNumber: payload.phoneNumber !== undefined ? payload.phoneNumber : existing.phone_number,
    nicIdNumber: payload.nicIdNumber !== undefined ? payload.nicIdNumber : existing.nic_id_number,
    vulnerableCategories:
      payload.vulnerableCategories !== undefined
        ? payload.vulnerableCategories
        : existingVulns,
    medicalConditions:
      payload.medicalConditions !== undefined
        ? payload.medicalConditions
        : existingMeds,
    disabilityDetails:
      payload.disabilityDetails !== undefined
        ? payload.disabilityDetails
        : existing.disability_details,
  };

  const validated = validateFamilyMemberInput(mergedPayload, true);

  const updatedRows = await sql`
    UPDATE family_members
    SET
      name = ${validated.name},
      age = ${validated.age},
      gender = ${validated.gender},
      phone_number = ${validated.phoneNumber},
      nic_id_number = ${validated.nicIdNumber},
      blood_group = ${validated.bloodGroup},
      disability_details = ${validated.disabilityDetails},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${memberId}
    RETURNING id, user_id, name, age, gender, phone_number, nic_id_number, blood_group, disability_details, created_at, updated_at
  `;

  const updated = updatedRows[0];

  // Re-sync vulnerabilities table
  await sql`
    DELETE FROM family_member_vulnerabilities
    WHERE family_member_id = ${memberId}
  `;
  for (const category of validated.vulnerableCategories) {
    await sql`
      INSERT INTO family_member_vulnerabilities (family_member_id, vulnerability_type)
      VALUES (${memberId}, ${category})
      ON CONFLICT DO NOTHING
    `;
  }

  // Re-sync medical conditions table
  await sql`
    DELETE FROM family_member_medical_conditions
    WHERE family_member_id = ${memberId}
  `;
  for (const condition of validated.medicalConditions) {
    await sql`
      INSERT INTO family_member_medical_conditions (family_member_id, medical_condition)
      VALUES (${memberId}, ${condition})
      ON CONFLICT DO NOTHING
    `;
  }

  return formatMemberRow(
    updated,
    validated.vulnerableCategories,
    validated.medicalConditions,
  );
}

export async function deleteFamilyMember(
  userId: number,
  memberId: number,
): Promise<{ success: boolean; message: string }> {
  const rows = await sql`
    SELECT user_id
    FROM family_members
    WHERE id = ${memberId}
    LIMIT 1
  `;

  const existing = rows[0];

  if (!existing) {
    throw new FamilyMemberServiceError(404, 'Family member not found.');
  }

  if (existing.user_id !== userId) {
    throw new FamilyMemberServiceError(
      403,
      'You are not authorized to remove family members belonging to another household.',
    );
  }

  await sql`
    DELETE FROM family_members
    WHERE id = ${memberId}
  `;

  return {
    success: true,
    message: 'Family member removed successfully.',
  };
}
