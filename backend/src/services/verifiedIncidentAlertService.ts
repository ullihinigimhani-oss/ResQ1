import type { Alert, AlertRiskLevel } from '../types/alert.js';
import type { Incident, IncidentStatus } from '../types/incident.js';

export type GeneratedIncidentAlertValues = {
  alertAudience: 'GENERAL_PUBLIC';
  affectedArea: string;
  disasterType: string;
  expiresAt: null;
  message: string;
  riskLevel: AlertRiskLevel;
  safetyInstructions: null;
  title: string;
};

export type GeneratedIncidentAlertResult = {
  alert: Alert;
  created: boolean;
};

export type IncidentStatusChangeResult = {
  alertCreated: boolean;
  generatedAlert: Alert | null;
  incident: Incident;
};

type IncidentStatusChangeDependencies = {
  createAlertForIncident: (incident: Incident) => Promise<GeneratedIncidentAlertResult>;
  setNonVerifiedStatus: (status: Exclude<IncidentStatus, 'Verified'>) => Promise<Incident>;
  setVerifiedStatus: () => Promise<Incident>;
};

export function incidentSeverityToAlertRiskLevel(severity: string): AlertRiskLevel {
  const normalizedSeverity = severity.trim().toLowerCase();

  if (normalizedSeverity === 'low') {
    return 'Low';
  }

  if (normalizedSeverity === 'medium' || normalizedSeverity === 'moderate') {
    return 'Moderate';
  }

  if (normalizedSeverity === 'high') {
    return 'High';
  }

  if (normalizedSeverity === 'critical') {
    return 'Critical';
  }

  throw new Error(`Unsupported incident severity: ${severity}`);
}

export function mapVerifiedIncidentToAlert(incident: Incident): GeneratedIncidentAlertValues {
  return {
    alertAudience: 'GENERAL_PUBLIC',
    affectedArea: incident.location,
    disasterType: incident.incidentType,
    expiresAt: null,
    message: incident.description,
    riskLevel: incidentSeverityToAlertRiskLevel(incident.severity),
    safetyInstructions: null,
    title: incident.title,
  };
}

export async function processIncidentStatusChange(
  status: IncidentStatus,
  dependencies: IncidentStatusChangeDependencies,
): Promise<IncidentStatusChangeResult> {
  if (status !== 'Verified') {
    return {
      alertCreated: false,
      generatedAlert: null,
      incident: await dependencies.setNonVerifiedStatus(status),
    };
  }

  const incident = await dependencies.setVerifiedStatus();
  const generatedAlert = await dependencies.createAlertForIncident(incident);

  return {
    alertCreated: generatedAlert.created,
    generatedAlert: generatedAlert.alert,
    incident,
  };
}
