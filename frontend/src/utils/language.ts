import type { Alert, AlertRiskLevel } from '@/types/alert';
import type { PreferredLanguage } from '@/types/auth';

export const preferredLanguages = ['English', 'Sinhala', 'Tamil'] as const satisfies readonly PreferredLanguage[];

export const preferredLanguageLabels: Record<PreferredLanguage, string> = {
  English: 'English',
  Sinhala: 'සිංහල',
  Tamil: 'தமிழ்',
};

export function preferredLanguageOrNull(value: string | null | undefined): PreferredLanguage | null {
  return preferredLanguages.includes(value as PreferredLanguage) ? (value as PreferredLanguage) : null;
}

export function toPreferredLanguage(
  value: string | null | undefined,
  fallback: PreferredLanguage = 'English',
): PreferredLanguage {
  return preferredLanguageOrNull(value) ?? fallback;
}

type ResidentAlertUiKey =
  | 'allClear'
  | 'checkConnection'
  | 'emergencyAlerts'
  | 'issued'
  | 'language'
  | 'loadingAlerts'
  | 'noActiveAlerts'
  | 'noActiveEmergencyAlerts'
  | 'noResidentAreaAlert'
  | 'registeredArea'
  | 'retry'
  | 'risk'
  | 'subtitle'
  | 'unableLoadAlerts'
  | 'viewAlert'
  | 'warning'
  | 'yourArea'
  | 'yourAreaClear';

export const residentAlertUiText: Record<PreferredLanguage, Record<ResidentAlertUiKey, string>> = {
  English: {
    allClear: 'All Clear',
    checkConnection: 'Check your connection and try again.',
    emergencyAlerts: 'Emergency Alerts',
    issued: 'Issued',
    language: 'Language',
    loadingAlerts: 'Checking verified alerts...',
    noActiveAlerts: 'No Active Alerts',
    noActiveEmergencyAlerts: 'There are currently no active emergency alerts.',
    noResidentAreaAlert: 'No active emergency alert is currently affecting your registered area.',
    registeredArea: 'Registered area',
    retry: 'Retry',
    risk: 'Risk',
    subtitle: 'Verified emergency warnings for your area',
    unableLoadAlerts: 'Unable to load emergency alerts.',
    viewAlert: 'View Alert',
    warning: 'WARNING',
    yourArea: 'YOUR AREA',
    yourAreaClear: 'Your Area is Currently Clear',
  },
  Sinhala: {
    allClear: 'සියල්ල ආරක්ෂිතයි',
    checkConnection: 'ඔබගේ සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
    emergencyAlerts: 'හදිසි අනතුරු ඇඟවීම්',
    issued: 'නිකුත් කළේ',
    language: 'භාෂාව',
    loadingAlerts: 'තහවුරු කළ අනතුරු ඇඟවීම් පරීක්ෂා කරමින්...',
    noActiveAlerts: 'සක්‍රීය අනතුරු ඇඟවීම් නැත',
    noActiveEmergencyAlerts: 'දැනට සක්‍රීය හදිසි අනතුරු ඇඟවීම් නොමැත.',
    noResidentAreaAlert: 'ඔබගේ ලියාපදිංචි ප්‍රදේශයට දැනට සක්‍රීය හදිසි අනතුරු ඇඟවීමක් බලපාන්නේ නැත.',
    registeredArea: 'ලියාපදිංචි ප්‍රදේශය',
    retry: 'නැවත උත්සාහ කරන්න',
    risk: 'අවදානම',
    subtitle: 'ඔබගේ ප්‍රදේශය සඳහා තහවුරු කළ හදිසි අනතුරු ඇඟවීම්',
    unableLoadAlerts: 'හදිසි අනතුරු ඇඟවීම් පූරණය කළ නොහැක.',
    viewAlert: 'අනතුරු ඇඟවීම බලන්න',
    warning: 'අනතුරු ඇඟවීම',
    yourArea: 'ඔබගේ ප්‍රදේශය',
    yourAreaClear: 'ඔබගේ ප්‍රදේශය දැනට ආරක්ෂිතයි',
  },
  Tamil: {
    allClear: 'அனைத்தும் தெளிவு',
    checkConnection: 'உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    emergencyAlerts: 'அவசர எச்சரிக்கைகள்',
    issued: 'வெளியிடப்பட்டது',
    language: 'மொழி',
    loadingAlerts: 'உறுதிப்படுத்தப்பட்ட எச்சரிக்கைகள் சரிபார்க்கப்படுகின்றன...',
    noActiveAlerts: 'செயலில் உள்ள எச்சரிக்கைகள் இல்லை',
    noActiveEmergencyAlerts: 'தற்போது செயலில் உள்ள அவசர எச்சரிக்கைகள் இல்லை.',
    noResidentAreaAlert: 'உங்கள் பதிவு செய்யப்பட்ட பகுதியை தற்போது எந்த செயலில் உள்ள அவசர எச்சரிக்கையும் பாதிக்கவில்லை.',
    registeredArea: 'பதிவு செய்யப்பட்ட பகுதி',
    retry: 'மீண்டும் முயற்சி',
    risk: 'அபாயம்',
    subtitle: 'உங்கள் பகுதிக்கான உறுதிப்படுத்தப்பட்ட அவசர எச்சரிக்கைகள்',
    unableLoadAlerts: 'அவசர எச்சரிக்கைகளை ஏற்ற முடியவில்லை.',
    viewAlert: 'எச்சரிக்கையை பார்க்க',
    warning: 'எச்சரிக்கை',
    yourArea: 'உங்கள் பகுதி',
    yourAreaClear: 'உங்கள் பகுதி தற்போது பாதுகாப்பாக உள்ளது',
  },
};

const riskLevelText: Record<PreferredLanguage, Record<AlertRiskLevel, string>> = {
  English: {
    Critical: 'CRITICAL',
    High: 'HIGH',
    Low: 'LOW',
    Moderate: 'MODERATE',
  },
  Sinhala: {
    Critical: 'අතිශය බරපතල',
    High: 'ඉහළ',
    Low: 'අඩු',
    Moderate: 'මධ්‍යම',
  },
  Tamil: {
    Critical: 'மிகக் கடுமை',
    High: 'அதிக',
    Low: 'குறைந்த',
    Moderate: 'மிதமான',
  },
};

const statusText: Record<PreferredLanguage, Record<string, string>> = {
  English: {
    Active: 'ACTIVE',
    Cancelled: 'CANCELLED',
    Expired: 'EXPIRED',
    Resolved: 'RESOLVED',
  },
  Sinhala: {
    Active: 'සක්‍රීය',
    Cancelled: 'අවලංගු කර ඇත',
    Expired: 'කල් ඉකුත් වී ඇත',
    Resolved: 'විසඳී ඇත',
  },
  Tamil: {
    Active: 'செயலில்',
    Cancelled: 'ரத்து செய்யப்பட்டது',
    Expired: 'காலாவதியானது',
    Resolved: 'தீர்க்கப்பட்டது',
  },
};

const knownAlertTitleText: Record<string, Partial<Record<PreferredLanguage, string>>> = {
  flood: {
    Sinhala: 'ගංවතුර',
    Tamil: 'வெள்ளம்',
  },
  'flood advisory': {
    Sinhala: 'ගංවතුර උපදෙස්',
    Tamil: 'வெள்ள ஆலோசனை',
  },
  'flood alert': {
    Sinhala: 'ගංවතුර අවදානම් දැනුම්දීම',
    Tamil: 'வெள்ள அறிவிப்பு',
  },
  'flood warning': {
    Sinhala: 'ගංවතුර අනතුරු ඇඟවීම',
    Tamil: 'வெள்ள எச்சரிக்கை',
  },
  'heavy rain advisory': {
    Sinhala: 'අධික වැසි උපදෙස්',
    Tamil: 'கனமழை ஆலோசனை',
  },
  'heavy rain warning': {
    Sinhala: 'අධික වැසි අනතුරු ඇඟවීම',
    Tamil: 'கனமழை எச்சரிக்கை',
  },
  'strong wind advisory': {
    Sinhala: 'තද සුළං උපදෙස්',
    Tamil: 'பலத்த காற்று ஆலோசனை',
  },
  'strong wind warning': {
    Sinhala: 'තද සුළං අනතුරු ඇඟවීම',
    Tamil: 'பலத்த காற்று எச்சரிக்கை',
  },
};

function normalizedPhrase(value: string) {
  return value.trim().toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function translateRiskLevel(riskLevel: AlertRiskLevel, language: PreferredLanguage) {
  return riskLevelText[language][riskLevel];
}

export function translateAlertStatus(status: string, language: PreferredLanguage) {
  return statusText[language][status] ?? status;
}

export function translateAlertTitle(alert: Alert, language: PreferredLanguage) {
  if (language === 'English') {
    return alert.title;
  }

  return knownAlertTitleText[normalizedPhrase(alert.title)]?.[language] ?? alert.title;
}

export function translateAlertMessage(alert: Alert, _language: PreferredLanguage) {
  return alert.message;
}
