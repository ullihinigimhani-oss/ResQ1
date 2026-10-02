import assert from 'node:assert/strict';
import test from 'node:test';

import type { Alert } from '../src/types/alert.js';
import type { Incident, IncidentStatus } from '../src/types/incident.js';

process.env.DATABASE_URL = process.env.DATABASE_URL
  || 'postgresql://test:test@localhost/test';

const {
  mapVerifiedIncidentToAlert,
  processIncidentStatusChange,
} = await import('../src/services/verifiedIncidentAlertService.js');
const {
  collectEligibleSmsRecipients,
  isBasicPhoneSmsRiskEligible,
} = await import('../src/services/alertSmsService.js');
const { dispatchPublishedAlertDeliveries } = await import('../src/services/alertDeliveryService.js');

function incident(status: IncidentStatus = 'Reported', severity = 'High'): Incident {
  return {
    id: 41,
    incidentType: 'Flood',
    title: 'Flood near main road',
    description: 'Water is rising across the main road.',
    location: 'Kuliyapitiya',
    latitude: 7.4688,
    longitude: 80.0401,
    severity,
    photoUrl: null,
    status,
    createdAt: '2026-09-29T12:00:00.000Z',
    updatedAt: '2026-09-29T12:05:00.000Z',
    photos: [],
  };
}

function alertFromIncident(source: Incident, id = 501): Alert {
  const mapped = mapVerifiedIncidentToAlert(source);

  return {
    id,
    title: mapped.title,
    disasterType: mapped.disasterType,
    affectedArea: mapped.affectedArea,
    alertAudience: mapped.alertAudience,
    riskLevel: mapped.riskLevel,
    message: mapped.message,
    safetyInstructions: '',
    status: 'Active',
    expiresAt: null,
    createdBy: 9,
    createdAt: '2026-09-29T12:06:00.000Z',
    updatedAt: '2026-09-29T12:06:00.000Z',
    isRelevantToResident: false,
    isSubscribedArea: false,
    schools: [],
  };
}

function immediate() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

test('PENDING/Reported to Verified creates one generated alert', async () => {
  let createCount = 0;
  const verifiedIncident = incident('Verified');
  const generatedAlert = alertFromIncident(verifiedIncident);
  const result = await processIncidentStatusChange('Verified', {
    createAlertForIncident: async () => {
      createCount += 1;
      return { alert: generatedAlert, created: true };
    },
    setNonVerifiedStatus: async () => incident(),
    setVerifiedStatus: async () => verifiedIncident,
  });

  assert.equal(result.incident.status, 'Verified');
  assert.equal(result.alertCreated, true);
  assert.equal(result.generatedAlert?.id, generatedAlert.id);
  assert.equal(createCount, 1);
});

test('generated alert contains the mapped incident data', () => {
  const mapped = mapVerifiedIncidentToAlert(incident('Verified', 'Medium'));

  assert.deepEqual(mapped, {
    alertAudience: 'GENERAL_PUBLIC',
    affectedArea: 'Kuliyapitiya',
    disasterType: 'Flood',
    expiresAt: null,
    message: 'Water is rising across the main road.',
    riskLevel: 'Moderate',
    safetyInstructions: null,
    title: 'Flood near main road',
  });
});

test('verifying the same incident again reuses its generated alert', async () => {
  const verifiedIncident = incident('Verified');
  const generatedAlert = alertFromIncident(verifiedIncident);
  let storedAlert: Alert | null = null;
  let insertCount = 0;
  const dependencies = {
    createAlertForIncident: async () => {
      if (storedAlert) {
        return { alert: storedAlert, created: false };
      }

      insertCount += 1;
      storedAlert = generatedAlert;
      return { alert: generatedAlert, created: true };
    },
    setNonVerifiedStatus: async () => incident(),
    setVerifiedStatus: async () => verifiedIncident,
  };

  const first = await processIncidentStatusChange('Verified', dependencies);
  const second = await processIncidentStatusChange('Verified', dependencies);

  assert.equal(first.alertCreated, true);
  assert.equal(second.alertCreated, false);
  assert.equal(second.generatedAlert?.id, first.generatedAlert?.id);
  assert.equal(insertCount, 1);
});

test('HIGH verified incidents remain eligible for the existing SMS flow', () => {
  const mapped = mapVerifiedIncidentToAlert(incident('Verified', 'High'));

  assert.equal(mapped.riskLevel, 'High');
  assert.equal(isBasicPhoneSmsRiskEligible(mapped.riskLevel), true);
});

test('CRITICAL verified incidents remain eligible for the existing SMS flow', () => {
  const mapped = mapVerifiedIncidentToAlert(incident('Verified', 'Critical'));

  assert.equal(mapped.riskLevel, 'Critical');
  assert.equal(isBasicPhoneSmsRiskEligible(mapped.riskLevel), true);
});

test('LOW and MODERATE generated alerts do not qualify for SMS', () => {
  const low = mapVerifiedIncidentToAlert(incident('Verified', 'Low'));
  const moderate = mapVerifiedIncidentToAlert(incident('Verified', 'Medium'));

  assert.equal(isBasicPhoneSmsRiskEligible(low.riskLevel), false);
  assert.equal(isBasicPhoneSmsRiskEligible(moderate.riskLevel), false);
});

test('different-area Basic Phone Residents are excluded from generated alert SMS recipients', () => {
  const recipients = collectEligibleSmsRecipients('Kuliyapitiya', [
    { area: 'Kuliyapitiya', id: 1, phone_number: '0771111111' },
    { area: 'Colombo', id: 2, phone_number: '0712222222' },
  ]);

  assert.deepEqual(recipients, [{ phoneNumber: '+94771111111', residentId: 1 }]);
});

test('SMS failure does not undo the verified incident result', async () => {
  const verifiedIncident = incident('Verified');
  const generatedAlert = alertFromIncident(verifiedIncident);
  const result = await processIncidentStatusChange('Verified', {
    createAlertForIncident: async () => ({ alert: generatedAlert, created: true }),
    setNonVerifiedStatus: async () => incident(),
    setVerifiedStatus: async () => verifiedIncident,
  });

  dispatchPublishedAlertDeliveries(generatedAlert, {
    dispatchSms: async () => { throw new Error('TextBee unavailable'); },
    logError: () => undefined,
    logInfo: () => undefined,
    sendPushNotifications: async () => undefined,
  });
  await immediate();

  assert.equal(result.incident.status, 'Verified');
});

test('SMS failure does not remove the generated alert result', async () => {
  const verifiedIncident = incident('Verified');
  const generatedAlert = alertFromIncident(verifiedIncident);
  const result = await processIncidentStatusChange('Verified', {
    createAlertForIncident: async () => ({ alert: generatedAlert, created: true }),
    setNonVerifiedStatus: async () => incident(),
    setVerifiedStatus: async () => verifiedIncident,
  });

  dispatchPublishedAlertDeliveries(generatedAlert, {
    dispatchSms: async () => { throw new Error('TextBee timeout'); },
    logError: () => undefined,
    logInfo: () => undefined,
    sendPushNotifications: async () => undefined,
  });
  await immediate();

  assert.equal(result.generatedAlert?.id, generatedAlert.id);
  assert.equal(result.alertCreated, true);
});

test('non-Verified status changes never create alerts', async () => {
  const statuses: Exclude<IncidentStatus, 'Verified'>[] = ['Reported', 'Under Review', 'Rejected'];
  let createCount = 0;

  for (const status of statuses) {
    const result = await processIncidentStatusChange(status, {
      createAlertForIncident: async () => {
        createCount += 1;
        return { alert: alertFromIncident(incident('Verified')), created: true };
      },
      setNonVerifiedStatus: async (nextStatus) => incident(nextStatus),
      setVerifiedStatus: async () => incident('Verified'),
    });

    assert.equal(result.incident.status, status);
    assert.equal(result.generatedAlert, null);
    assert.equal(result.alertCreated, false);
  }

  assert.equal(createCount, 0);
});
