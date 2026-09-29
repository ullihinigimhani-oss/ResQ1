import { sql } from '../config/database.js';
import type { Alert } from '../types/alert.js';
import { ensureBasicPhoneResidentSchema } from './basicPhoneResidentService.js';
import {
  normalizeSriLankanPhoneNumber,
  sendSmsViaTextbee,
  type TextbeeSendResult,
} from './textbeeService.js';

type BasicPhoneResidentSmsRow = {
  area: string;
  id: number;
  phone_number: string;
};

type SmsRecipient = {
  phoneNumber: string;
  residentId: number;
};

type AlertSmsDispatchResult = {
  providerBatchId: string | null;
  recipientCount: number;
  status: 'SENT_TO_GATEWAY' | 'SKIPPED_DUPLICATE' | 'SKIPPED_INELIGIBLE' | 'SKIPPED_NO_RECIPIENTS';
};

type InstructionKey = 'drought' | 'earthquake' | 'fire' | 'flood' | 'generic' | 'landslide' | 'storm' | 'tsunami';

type LocalizedDisaster = {
  english: string;
  instruction: InstructionKey;
  sinhala: string;
  tamil: string;
};

const SMS_PROVIDER = 'TEXTBEE';
const ELIGIBLE_RISK_LEVELS = new Set(['high', 'critical']);
const RISK_LABELS = {
  critical: {
    english: 'CRITICAL',
    sinhala: 'අතිශය බරපතළ',
    tamil: 'மிகக் கடுமையான',
  },
  high: {
    english: 'HIGH',
    sinhala: 'ඉහළ',
    tamil: 'அதிக',
  },
} as const;

const DISASTER_TRANSLATIONS: Record<string, LocalizedDisaster> = {
  cyclone: {
    english: 'cyclone',
    instruction: 'storm',
    sinhala: 'සුළි කුණාටු',
    tamil: 'சூறாவளி',
  },
  drought: {
    english: 'drought',
    instruction: 'drought',
    sinhala: 'නියඟ',
    tamil: 'வறட்சி',
  },
  earthquake: {
    english: 'earthquake',
    instruction: 'earthquake',
    sinhala: 'භූමිකම්පා',
    tamil: 'நிலநடுக்கம்',
  },
  fire: {
    english: 'fire',
    instruction: 'fire',
    sinhala: 'ගිනි',
    tamil: 'தீ',
  },
  flood: {
    english: 'flood',
    instruction: 'flood',
    sinhala: 'ගංවතුර',
    tamil: 'வெள்ளம்',
  },
  'heavy rain': {
    english: 'heavy rain',
    instruction: 'flood',
    sinhala: 'අධික වැසි',
    tamil: 'கனமழை',
  },
  landslide: {
    english: 'landslide',
    instruction: 'landslide',
    sinhala: 'නායයෑම්',
    tamil: 'நிலச்சரிவு',
  },
  'severe weather': {
    english: 'severe weather',
    instruction: 'storm',
    sinhala: 'දැඩි කාලගුණ',
    tamil: 'கடுமையான வானிலை',
  },
  'strong winds / storm': {
    english: 'strong wind or storm',
    instruction: 'storm',
    sinhala: 'තද සුළං හෝ කුණාටු',
    tamil: 'பலத்த காற்று அல்லது புயல்',
  },
  tsunami: {
    english: 'tsunami',
    instruction: 'tsunami',
    sinhala: 'සුනාමි',
    tamil: 'சுனாமி',
  },
};

const GENERIC_DISASTER: LocalizedDisaster = {
  english: 'emergency',
  instruction: 'generic',
  sinhala: 'හදිසි',
  tamil: 'அவசரநிலை',
};

const SAFETY_INSTRUCTIONS: Record<InstructionKey, {
  english: string;
  sinhala: string;
  tamil: string;
}> = {
  drought: {
    english: 'Conserve water and follow official instructions.',
    sinhala: 'ජලය ඉතිරි කර නිල උපදෙස් පිළිපදින්න.',
    tamil: 'தண்ணீரைச் சிக்கனமாகப் பயன்படுத்தி அதிகாரப்பூர்வ வழிமுறைகளைப் பின்பற்றவும்.',
  },
  earthquake: {
    english: 'Drop, cover, hold on, and follow official instructions.',
    sinhala: 'බිම පහත්වී ආවරණය ලබාගෙන නිල උපදෙස් පිළිපදින්න.',
    tamil: 'கீழே குனிந்து, பாதுகாப்பாக மறைந்து, அதிகாரப்பூர்வ வழிமுறைகளைப் பின்பற்றவும்.',
  },
  fire: {
    english: 'Move away from fire and smoke and follow evacuation instructions.',
    sinhala: 'ගින්න හා දුමෙන් ඈත්ව ඉවත් කිරීමේ උපදෙස් පිළිපදින්න.',
    tamil: 'தீ மற்றும் புகையிலிருந்து விலகி வெளியேற்ற வழிமுறைகளைப் பின்பற்றவும்.',
  },
  flood: {
    english: 'Move to higher ground and avoid flooded roads.',
    sinhala: 'උස් බිමකට ගොස් ජලයෙන් යට වූ මාර්ගවලින් වළකින්න.',
    tamil: 'உயரமான இடத்திற்குச் சென்று வெள்ளம் சூழ்ந்த சாலைகளைத் தவிர்க்கவும்.',
  },
  generic: {
    english: 'Move to a safe place and follow official instructions.',
    sinhala: 'ආරක්ෂිත ස්ථානයකට ගොස් නිල උපදෙස් පිළිපදින්න.',
    tamil: 'பாதுகாப்பான இடத்திற்குச் சென்று அதிகாரப்பூர்வ வழிமுறைகளைப் பின்பற்றவும்.',
  },
  landslide: {
    english: 'Move away from unstable slopes and follow evacuation instructions.',
    sinhala: 'අස්ථාවර බෑවුම්වලින් ඈත්ව ඉවත් කිරීමේ උපදෙස් පිළිපදින්න.',
    tamil: 'நிலையற்ற சரிவுகளிலிருந்து விலகி வெளியேற்ற வழிமுறைகளைப் பின்பற்றவும்.',
  },
  storm: {
    english: 'Stay indoors and avoid trees and power lines.',
    sinhala: 'ගෘහස්ථව රැඳී සිට ගස් හා විදුලි රැහැන්වලින් ඈත්වන්න.',
    tamil: 'வீட்டினுள் இருந்து மரங்கள் மற்றும் மின் கம்பிகளைத் தவிர்க்கவும்.',
  },
  tsunami: {
    english: 'Move inland or to higher ground and avoid coastal areas.',
    sinhala: 'රට අභ්‍යන්තරයට හෝ උස් බිමකට ගොස් වෙරළබඩ ප්‍රදේශවලින් වළකින්න.',
    tamil: 'உள்நாட்டிற்கு அல்லது உயரமான இடத்திற்குச் சென்று கடற்கரைப் பகுதிகளைத் தவிர்க்கவும்.',
  },
};

let smsAlertLogSchemaReady: Promise<void> | null = null;

function normalizedText(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

export function normalizeAreaKey(value: unknown) {
  return normalizedText(value).toLocaleLowerCase('en');
}

export function isBasicPhoneSmsRiskEligible(riskLevel: unknown) {
  return ELIGIBLE_RISK_LEVELS.has(normalizedText(riskLevel).toLowerCase());
}

export function collectEligibleSmsRecipients(
  affectedArea: unknown,
  residents: readonly BasicPhoneResidentSmsRow[],
) {
  const targetArea = normalizeAreaKey(affectedArea);
  const recipients = new Map<string, SmsRecipient>();

  if (!targetArea) {
    return [];
  }

  residents.forEach((resident) => {
    if (normalizeAreaKey(resident.area) !== targetArea) {
      return;
    }

    const phoneNumber = normalizeSriLankanPhoneNumber(resident.phone_number);

    if (phoneNumber && !recipients.has(phoneNumber)) {
      recipients.set(phoneNumber, {
        phoneNumber,
        residentId: resident.id,
      });
    }
  });

  return [...recipients.values()];
}

function disasterKey(value: unknown) {
  return normalizedText(value).toLowerCase();
}

export function buildMultilingualEmergencySms(
  alert: Pick<Alert, 'affectedArea' | 'disasterType' | 'riskLevel'>,
) {
  const area = normalizedText(alert.affectedArea) || 'Affected area';
  const disasterType = normalizedText(alert.disasterType) || 'Emergency';
  const localizedDisaster = DISASTER_TRANSLATIONS[disasterKey(disasterType)] ?? GENERIC_DISASTER;
  const riskKey = normalizedText(alert.riskLevel).toLowerCase() as keyof typeof RISK_LABELS;
  const risk = RISK_LABELS[riskKey] ?? RISK_LABELS.high;
  const instructions = SAFETY_INSTRUCTIONS[localizedDisaster.instruction];
  const unknownType = localizedDisaster === GENERIC_DISASTER ? ` (${disasterType})` : '';

  return [
    'RESQ1 EMERGENCY ALERT',
    '',
    'සිංහල:',
    `${area} ප්‍රදේශයට ${risk.sinhala} ${localizedDisaster.sinhala} අවදානමක්${unknownType} ඇත.`,
    instructions.sinhala,
    '',
    'English:',
    `${risk.english} ${localizedDisaster.english} risk in ${area}${unknownType}.`,
    instructions.english,
    '',
    'தமிழ்:',
    `${area} பகுதியில் ${risk.tamil} ${localizedDisaster.tamil} அபாயம்${unknownType} உள்ளது.`,
    instructions.tamil,
  ].join('\n');
}

export async function ensureSmsAlertLogSchema() {
  smsAlertLogSchemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS sms_alert_logs (
        id SERIAL PRIMARY KEY,
        alert_id INTEGER NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
        basic_phone_resident_id INTEGER REFERENCES basic_phone_residents(id) ON DELETE SET NULL,
        phone_number VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL CHECK (status IN ('PENDING', 'SENT_TO_GATEWAY', 'FAILED')),
        provider VARCHAR(30) NOT NULL DEFAULT 'TEXTBEE',
        provider_batch_id VARCHAR(150),
        error_message VARCHAR(500),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(alert_id, phone_number)
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_alert_id
      ON sms_alert_logs(alert_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_sms_alert_logs_status
      ON sms_alert_logs(status)
    `;
  })();

  await smsAlertLogSchemaReady;
}

async function claimSmsRecipient(alertId: number, recipient: SmsRecipient) {
  const rows = await sql`
    INSERT INTO sms_alert_logs (
      alert_id,
      basic_phone_resident_id,
      phone_number,
      status,
      provider
    )
    VALUES (
      ${alertId},
      ${recipient.residentId},
      ${recipient.phoneNumber},
      'PENDING',
      ${SMS_PROVIDER}
    )
    ON CONFLICT (alert_id, phone_number) DO NOTHING
    RETURNING id
  `;

  return Boolean(rows[0]);
}

async function updateSmsLog(
  alertId: number,
  phoneNumber: string,
  status: 'FAILED' | 'SENT_TO_GATEWAY',
  providerBatchId: string | null,
  errorMessage: string | null,
) {
  await sql`
    UPDATE sms_alert_logs
    SET status = ${status},
        provider_batch_id = ${providerBatchId},
        error_message = ${errorMessage},
        updated_at = CURRENT_TIMESTAMP
    WHERE alert_id = ${alertId}
      AND phone_number = ${phoneNumber}
  `;
}

function safeSmsErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unexpected SMS dispatch failure.';

  return message.slice(0, 500);
}

async function recordTextbeeSuccess(
  alertId: number,
  recipients: readonly SmsRecipient[],
  result: TextbeeSendResult,
) {
  await Promise.all(recipients.map((recipient) => updateSmsLog(
    alertId,
    recipient.phoneNumber,
    'SENT_TO_GATEWAY',
    result.providerBatchId,
    null,
  )));
}

async function recordTextbeeFailure(
  alertId: number,
  recipients: readonly SmsRecipient[],
  error: unknown,
) {
  const errorMessage = safeSmsErrorMessage(error);

  await Promise.all(recipients.map((recipient) => updateSmsLog(
    alertId,
    recipient.phoneNumber,
    'FAILED',
    null,
    errorMessage,
  )));
}

export async function dispatchBasicPhoneAlertSms(alert: Alert): Promise<AlertSmsDispatchResult> {
  if (alert.status !== 'Active' || !isBasicPhoneSmsRiskEligible(alert.riskLevel)) {
    return {
      providerBatchId: null,
      recipientCount: 0,
      status: 'SKIPPED_INELIGIBLE',
    };
  }

  const areaKey = normalizeAreaKey(alert.affectedArea);

  if (!areaKey) {
    return {
      providerBatchId: null,
      recipientCount: 0,
      status: 'SKIPPED_NO_RECIPIENTS',
    };
  }

  await ensureBasicPhoneResidentSchema();
  await ensureSmsAlertLogSchema();

  const rows = await sql`
    SELECT id, phone_number, area
    FROM basic_phone_residents
    WHERE LOWER(REGEXP_REPLACE(TRIM(area), '[[:space:]]+', ' ', 'g')) = ${areaKey}
    ORDER BY id ASC
  `;
  const recipients = collectEligibleSmsRecipients(
    alert.affectedArea,
    rows as BasicPhoneResidentSmsRow[],
  );

  if (recipients.length === 0) {
    return {
      providerBatchId: null,
      recipientCount: 0,
      status: 'SKIPPED_NO_RECIPIENTS',
    };
  }

  const claimedRecipients: SmsRecipient[] = [];

  for (const recipient of recipients) {
    if (await claimSmsRecipient(alert.id, recipient)) {
      claimedRecipients.push(recipient);
    }
  }

  if (claimedRecipients.length === 0) {
    return {
      providerBatchId: null,
      recipientCount: 0,
      status: 'SKIPPED_DUPLICATE',
    };
  }

  try {
    const result = await sendSmsViaTextbee(
      claimedRecipients.map((recipient) => recipient.phoneNumber),
      buildMultilingualEmergencySms(alert),
    );

    await recordTextbeeSuccess(alert.id, claimedRecipients, result);

    return {
      providerBatchId: result.providerBatchId,
      recipientCount: claimedRecipients.length,
      status: 'SENT_TO_GATEWAY',
    };
  } catch (error) {
    try {
      await recordTextbeeFailure(alert.id, claimedRecipients, error);
    } catch (auditError) {
      console.error(
        `Unable to update SMS failure audit for alert ${alert.id}:`,
        safeSmsErrorMessage(auditError),
      );
    }

    throw error;
  }
}
