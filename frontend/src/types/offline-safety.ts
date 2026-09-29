import type { AlertRiskLevel } from '@/types/alert';
import type { PreferredLanguage } from '@/types/auth';

export interface OfflineSafetyInstruction {
  alertId: number;
  disasterType: string;
  title: string;
  riskLevel: AlertRiskLevel;
  affectedArea: string;
  safetyInstructions: string[];
  language: PreferredLanguage;
  savedAt: string;
}

export type SaveOfflineSafetyInstruction = Omit<OfflineSafetyInstruction, 'savedAt'>;
