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

type AlertDetailUiKey =
  | 'acknowledgeAlert'
  | 'acknowledged'
  | 'acknowledgedMessage'
  | 'alertDetails'
  | 'area'
  | 'back'
  | 'checkConnection'
  | 'description'
  | 'emergencyActions'
  | 'emergencyActionsCopy'
  | 'emergencyType'
  | 'expires'
  | 'findNearestSafeShelter'
  | 'issued'
  | 'language'
  | 'loadingBody'
  | 'loadingTitle'
  | 'publishedSuccess'
  | 'retry'
  | 'riskLevel'
  | 'safetyInstructions'
  | 'reportIncident'
  | 'status'
  | 'unableLoadAlert'
  | 'viewSafeEvacuationRoute';

type FloodRiskTrendUiKey =
  | 'currentRisk'
  | 'floodRiskTrend'
  | 'noTrendData'
  | 'noTrendDataBody'
  | 'riskChangeHistory'
  | 'time'
  | 'trendUnavailable'
  | 'yAxisRiskLevel';

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

export const floodRiskTrendUiText: Record<PreferredLanguage, Record<FloodRiskTrendUiKey, string>> = {
  English: {
    currentRisk: 'Current Risk',
    floodRiskTrend: 'Flood Risk Trend',
    noTrendData: 'No risk trend data yet',
    noTrendDataBody: 'This alert has only a current risk value. Historical risk readings are required for a line chart.',
    riskChangeHistory: 'Alert risk changes over time',
    time: 'Time',
    trendUnavailable: 'Risk trend data is unavailable.',
    yAxisRiskLevel: 'Risk Level',
  },
  Sinhala: {
    currentRisk: 'වත්මන් අවදානම',
    floodRiskTrend: 'ගංවතුර අවදානම් ප්‍රවණතාව',
    noTrendData: 'අවදානම් ප්‍රවණතා දත්ත තවම නැත',
    noTrendDataBody: 'මෙම අනතුරු ඇඟවීමට ඇත්තේ වත්මන් අවදානම් අගයක් පමණි. රේඛා ප්‍රස්තාරයක් සඳහා ඓතිහාසික අවදානම් කියවීම් අවශ්‍ය වේ.',
    riskChangeHistory: 'කාලය අනුව අනතුරු ඇඟවීමේ අවදානම් වෙනස්වීම්',
    time: 'කාලය',
    trendUnavailable: 'අවදානම් ප්‍රවණතා දත්ත ලබා ගත නොහැක.',
    yAxisRiskLevel: 'අවදානම් මට්ටම',
  },
  Tamil: {
    currentRisk: 'தற்போதைய அபாயம்',
    floodRiskTrend: 'வெள்ள அபாயப் போக்கு',
    noTrendData: 'அபாயப் போக்கு தரவு இன்னும் இல்லை',
    noTrendDataBody: 'இந்த எச்சரிக்கையில் தற்போதைய அபாய மதிப்பு மட்டுமே உள்ளது. கோடு வரைபடத்திற்கு வரலாற்று அபாய வாசிப்புகள் தேவை.',
    riskChangeHistory: 'காலப்போக்கில் எச்சரிக்கை அபாய மாற்றங்கள்',
    time: 'நேரம்',
    trendUnavailable: 'அபாயப் போக்கு தரவை ஏற்ற முடியவில்லை.',
    yAxisRiskLevel: 'அபாய நிலை',
  },
};

export const alertDetailUiText: Record<PreferredLanguage, Record<AlertDetailUiKey, string>> = {
  English: {
    acknowledgeAlert: 'Acknowledge Alert',
    acknowledged: 'Acknowledged',
    acknowledgedMessage: 'Alert acknowledged on this device only. Backend acknowledgement persistence is not connected in the current frontend service layer.',
    alertDetails: 'Alert Details',
    area: 'Area',
    back: 'Back',
    checkConnection: 'Check your connection and try again.',
    description: 'Description',
    emergencyActions: 'Emergency Actions',
    emergencyActionsCopy: 'Use verified ResQ1 routes, shelters, and incident tools for this alert.',
    emergencyType: 'Emergency Type',
    expires: 'Expires',
    findNearestSafeShelter: 'Find Nearest Safe Shelter',
    issued: 'Issued',
    language: 'Language',
    loadingBody: 'Retrieving the latest verified warning.',
    loadingTitle: 'Loading alert details...',
    publishedSuccess: 'Emergency alert published successfully.',
    retry: 'Retry',
    riskLevel: 'Risk Level',
    safetyInstructions: 'Safety Instructions',
    reportIncident: 'Report Incident',
    status: 'Status',
    unableLoadAlert: 'Unable to load this emergency alert.',
    viewSafeEvacuationRoute: 'View Safe Evacuation Route',
  },
  Sinhala: {
    acknowledgeAlert: 'අනතුරු ඇඟවීම තහවුරු කරන්න',
    acknowledged: 'තහවුරු කර ඇත',
    acknowledgedMessage: 'මෙම උපාංගයේ පමණක් අනතුරු ඇඟවීම තහවුරු කර ඇත. පසුපස සේවා තහවුරු කිරීමේ සුරැකීම තවම සම්බන්ධ කර නැත.',
    alertDetails: 'අනතුරු ඇඟවීමේ විස්තර',
    area: 'ප්‍රදේශය',
    back: 'ආපසු',
    checkConnection: 'ඔබගේ සම්බන්ධතාව පරීක්ෂා කර නැවත උත්සාහ කරන්න.',
    description: 'විස්තරය',
    emergencyActions: 'හදිසි ක්‍රියාමාර්ග',
    emergencyActionsCopy: 'මෙම අනතුරු ඇඟවීම සඳහා තහවුරු කළ ResQ1 මාර්ග, ආරක්ෂිත ස්ථාන සහ සිද්ධි මෙවලම් භාවිතා කරන්න.',
    emergencyType: 'හදිසි තත්ත්ව වර්ගය',
    expires: 'කල් ඉකුත් වන්නේ',
    findNearestSafeShelter: 'ළඟම ආරක්ෂිත ස්ථානය සොයන්න',
    issued: 'නිකුත් කළේ',
    language: 'භාෂාව',
    loadingBody: 'නවතම තහවුරු කළ අනතුරු ඇඟවීම ලබා ගනිමින්...',
    loadingTitle: 'අනතුරු ඇඟවීමේ විස්තර පූරණය වෙමින්...',
    publishedSuccess: 'හදිසි අනතුරු ඇඟවීම සාර්ථකව පළ කර ඇත.',
    retry: 'නැවත උත්සාහ කරන්න',
    riskLevel: 'අවදානම් මට්ටම',
    safetyInstructions: 'ආරක්ෂක උපදෙස්',
    reportIncident: 'සිද්ධියක් වාර්තා කරන්න',
    status: 'තත්ත්වය',
    unableLoadAlert: 'මෙම හදිසි අනතුරු ඇඟවීම පූරණය කළ නොහැක.',
    viewSafeEvacuationRoute: 'ආරක්ෂිත ඉවත් කිරීමේ මාර්ගය බලන්න',
  },
  Tamil: {
    acknowledgeAlert: 'எச்சரிக்கையை உறுதிப்படுத்து',
    acknowledged: 'உறுதிப்படுத்தப்பட்டது',
    acknowledgedMessage: 'இந்த சாதனத்தில் மட்டும் எச்சரிக்கை உறுதிப்படுத்தப்பட்டது. பின்புல உறுதிப்படுத்தல் சேமிப்பு தற்போது இணைக்கப்படவில்லை.',
    alertDetails: 'எச்சரிக்கை விவரங்கள்',
    area: 'பகுதி',
    back: 'பின்',
    checkConnection: 'உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.',
    description: 'விளக்கம்',
    emergencyActions: 'அவசர நடவடிக்கைகள்',
    emergencyActionsCopy: 'இந்த எச்சரிக்கைக்கான உறுதிப்படுத்தப்பட்ட ResQ1 பாதைகள், தங்குமிடங்கள் மற்றும் சம்பவ கருவிகளைப் பயன்படுத்தவும்.',
    emergencyType: 'அவசர நிலை வகை',
    expires: 'காலாவதியாகும்',
    findNearestSafeShelter: 'அருகிலுள்ள பாதுகாப்பான தங்குமிடத்தை கண்டறி',
    issued: 'வெளியிடப்பட்டது',
    language: 'மொழி',
    loadingBody: 'சமீபத்திய உறுதிப்படுத்தப்பட்ட எச்சரிக்கை பெறப்படுகிறது.',
    loadingTitle: 'எச்சரிக்கை விவரங்கள் ஏற்றப்படுகின்றன...',
    publishedSuccess: 'அவசர எச்சரிக்கை வெற்றிகரமாக வெளியிடப்பட்டது.',
    retry: 'மீண்டும் முயற்சி',
    riskLevel: 'அபாய நிலை',
    safetyInstructions: 'பாதுகாப்பு வழிமுறைகள்',
    reportIncident: 'சம்பவத்தை அறிக்கை செய்',
    status: 'நிலை',
    unableLoadAlert: 'இந்த அவசர எச்சரிக்கையை ஏற்ற முடியவில்லை.',
    viewSafeEvacuationRoute: 'பாதுகாப்பான வெளியேற்ற பாதையைப் பார்க்க',
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

const knownAlertMessageText: Record<string, Partial<Record<PreferredLanguage, string>>> = {
  'avoid walking or driving in flood water': {
    Sinhala: 'ගංවතුර ජලය තුළ ඇවිදීම හෝ රිය පැදවීමෙන් වළකින්න.',
    Tamil: 'வெள்ளநீரில் நடப்பதையோ வாகனம் ஓட்டுவதையோ தவிர்க்கவும்.',
  },
  'follow instructions from authorities': {
    Sinhala: 'බලධාරීන්ගේ උපදෙස් අනුගමනය කරන්න.',
    Tamil: 'அதிகாரிகளின் அறிவுறுத்தல்களைப் பின்பற்றவும்.',
  },
  'follow official evacuation and safety instructions from emergency authorities': {
    Sinhala: 'හදිසි බලධාරීන්ගේ නිල ඉවත් කිරීමේ සහ ආරක්ෂක උපදෙස් අනුගමනය කරන්න.',
    Tamil: 'அவசர அதிகாரிகளின் அதிகாரப்பூர்வ வெளியேற்ற மற்றும் பாதுகாப்பு வழிமுறைகளைப் பின்பற்றவும்.',
  },
  'heavy rainfall and rising water levels': {
    Sinhala: 'අධික වැසි සහ ජල මට්ටම් ඉහළ යාම.',
    Tamil: 'கனமழை மற்றும் நீர்மட்டம் உயர்வு.',
  },
  'heavy rainfall expected': {
    Sinhala: 'අධික වැසි අපේක්ෂා කෙරේ.',
    Tamil: 'கனமழை எதிர்பார்க்கப்படுகிறது.',
  },
  'move to higher ground': {
    Sinhala: 'ඉහළ භූමි ප්‍රදේශයකට ගමන් කරන්න.',
    Tamil: 'உயரமான நிலப்பகுதிக்குச் செல்லவும்.',
  },
  'strong winds expected': {
    Sinhala: 'තද සුළං අපේක්ෂා කෙරේ.',
    Tamil: 'பலத்த காற்று எதிர்பார்க்கப்படுகிறது.',
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

export function translateDisasterType(value: string, language: PreferredLanguage) {
  if (language === 'English') {
    return value;
  }

  return knownAlertTitleText[normalizedPhrase(value)]?.[language] ?? value;
}

export function translateAlertMessage(alert: Alert, language: PreferredLanguage) {
  if (language === 'English') {
    return alert.message;
  }

  return knownAlertMessageText[normalizedPhrase(alert.message)]?.[language] ?? alert.message;
}

export function translateSafetyInstruction(instruction: string, language: PreferredLanguage) {
  if (language === 'English') {
    return instruction;
  }

  return knownAlertMessageText[normalizedPhrase(instruction)]?.[language] ?? instruction;
}

export function fallbackSafetyInstruction(language: PreferredLanguage) {
  const fallback = 'Follow official evacuation and safety instructions from emergency authorities.';

  return knownAlertMessageText[normalizedPhrase(fallback)]?.[language] ?? fallback;
}
