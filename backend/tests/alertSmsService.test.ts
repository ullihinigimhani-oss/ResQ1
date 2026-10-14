import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getTextbeeConfig,
  normalizeSriLankanPhoneNumber,
  sendSmsViaTextbee,
  TextbeeServiceError,
} from '../src/services/textbeeService.js';

process.env.DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://test:test@localhost/test';

const {
  buildMultilingualEmergencySms,
  collectEligibleSmsRecipients,
  dispatchBasicPhoneAlertSms,
  isBasicPhoneSmsRiskEligible,
  normalizeAreaKey,
} = await import('../src/services/alertSmsService.js');

const textbeeEnv = {
  TEXTBEE_API_KEY: 'test-key',
  TEXTBEE_BASE_URL: 'https://api.textbee.dev/api/v1',
  TEXTBEE_DEVICE_ID: 'test-device',
};

test('normalizes valid Sri Lankan mobile numbers to E.164', () => {
  assert.equal(normalizeSriLankanPhoneNumber('0771234567'), '+94771234567');
  assert.equal(normalizeSriLankanPhoneNumber('071 123 4567'), '+94711234567');
  assert.equal(normalizeSriLankanPhoneNumber('+94771234567'), '+94771234567');
  assert.equal(normalizeSriLankanPhoneNumber('12345'), null);
  assert.equal(normalizeSriLankanPhoneNumber('+947712345678'), null);
});

test('accepts only HIGH and CRITICAL alert risk levels', () => {
  assert.equal(isBasicPhoneSmsRiskEligible('Low'), false);
  assert.equal(isBasicPhoneSmsRiskEligible('Moderate'), false);
  assert.equal(isBasicPhoneSmsRiskEligible('HIGH'), true);
  assert.equal(isBasicPhoneSmsRiskEligible('Critical'), true);
});

test('skips SMS dispatch for active LOW and MODERATE alerts before any provider work', async () => {
  const baseAlert = {
    affectedArea: 'Kuliyapitiya',
    alertAudience: 'GENERAL_PUBLIC' as const,
    createdAt: new Date().toISOString(),
    createdBy: 1,
    disasterType: 'Flood',
    expiresAt: null,
    id: 10,
    isRelevantToResident: false,
    isSubscribedArea: false,
    message: 'Test warning',
    safetyInstructions: 'Move to safety.',
    schools: [],
    status: 'Active' as const,
    title: 'Flood Warning',
    updatedAt: new Date().toISOString(),
  };

  const lowResult = await dispatchBasicPhoneAlertSms({ ...baseAlert, riskLevel: 'Low' });
  const moderateResult = await dispatchBasicPhoneAlertSms({ ...baseAlert, riskLevel: 'Moderate' });

  assert.equal(lowResult.status, 'SKIPPED_INELIGIBLE');
  assert.equal(moderateResult.status, 'SKIPPED_INELIGIBLE');
});

test('uses normalized exact area matching and deduplicates valid numbers', () => {
  const recipients = collectEligibleSmsRecipients(' Kuliyapitiya ', [
    { area: 'KULIYAPITIYA', id: 1, phone_number: '0771111111' },
    { area: '  kuliyapitiya  ', id: 2, phone_number: '+94771111111' },
    { area: 'Kuliyapitiya', id: 3, phone_number: '0712222222' },
    { area: 'Kurunegala', id: 4, phone_number: '0753333333' },
    { area: 'Kuliyapitiya', id: 5, phone_number: 'invalid' },
  ]);

  assert.equal(normalizeAreaKey('  KULIYAPITIYA '), 'kuliyapitiya');
  assert.deepEqual(recipients, [
    { phoneNumber: '+94771111111', residentId: 1 },
    { phoneNumber: '+94712222222', residentId: 3 },
  ]);
});

test('builds one Unicode SMS containing Sinhala, English, Tamil, and alert data', () => {
  const message = buildMultilingualEmergencySms({
    affectedArea: 'Kuliyapitiya',
    disasterType: 'Flood',
    riskLevel: 'High',
  });

  assert.match(message, /RESQ1 EMERGENCY ALERT/);
  assert.match(message, /සිංහල:/);
  assert.match(message, /English:/);
  assert.match(message, /தமிழ்:/);
  assert.match(message, /Kuliyapitiya/);
  assert.match(message, /HIGH flood risk/);
});

test('uses a safe generic multilingual template for an unknown alert type', () => {
  const message = buildMultilingualEmergencySms({
    affectedArea: 'Test Area',
    disasterType: 'Unknown Event',
    riskLevel: 'Critical',
  });

  assert.match(message, /Unknown Event/);
  assert.match(message, /CRITICAL emergency risk/);
  assert.match(message, /සිංහල:/);
  assert.match(message, /தமிழ்:/);
});

test('validates TextBee configuration without exposing configuration values', () => {
  assert.deepEqual(getTextbeeConfig(textbeeEnv), {
    apiKey: 'test-key',
    baseUrl: 'https://api.textbee.dev/api/v1',
    deviceId: 'test-device',
  });

  assert.throws(
    () => getTextbeeConfig({}),
    (error) => error instanceof TextbeeServiceError && error.code === 'CONFIGURATION',
  );
});

test('sends one TextBee request for all recipients and reads the batch id', async () => {
  let requestBody: Record<string, unknown> | null = null;
  let requestUrl = '';

  const fetchImpl: typeof fetch = async (input, init) => {
    requestUrl = String(input);
    requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;

    return new Response(JSON.stringify({
      data: {
        smsBatchId: 'batch-123',
        success: true,
      },
    }), { status: 200 });
  };

  const result = await sendSmsViaTextbee(
    ['+94771111111', '+94712222222'],
    'Unicode: සිංහල English தமிழ்',
    { env: textbeeEnv, fetchImpl },
  );

  assert.equal(requestUrl, 'https://api.textbee.dev/api/v1/gateway/send-sms');
  assert.deepEqual(requestBody, {
    deviceId: 'test-device',
    message: 'Unicode: සිංහල English தமிழ்',
    recipients: ['+94771111111', '+94712222222'],
  });
  assert.deepEqual(result, {
    acceptedRecipients: 2,
    provider: 'TEXTBEE',
    providerBatchId: 'batch-123',
  });
});

test('reports TextBee timeouts as controlled service errors', async () => {
  const fetchImpl: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => {
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

  await assert.rejects(
    sendSmsViaTextbee(['+94771111111'], 'Test', {
      env: textbeeEnv,
      fetchImpl,
      timeoutMs: 5,
    }),
    (error) => error instanceof TextbeeServiceError && error.code === 'TIMEOUT',
  );
});

test('handles TextBee non-success responses without exposing the API key', async () => {
  const fetchImpl: typeof fetch = async () => new Response(
    JSON.stringify({ message: 'Provider detail that should not be surfaced.' }),
    { status: 503 },
  );

  await assert.rejects(
    sendSmsViaTextbee(['+94771111111'], 'Test', {
      env: textbeeEnv,
      fetchImpl,
    }),
    (error) => {
      assert.ok(error instanceof TextbeeServiceError);
      assert.equal(error.code, 'PROVIDER');
      assert.doesNotMatch(error.message, /test-key/);
      assert.match(error.message, /HTTP 503/);
      return true;
    },
  );
});
