import { buildSmsMessage, Language, SmsTemplateData } from './smsTemplates';

/**
 * Given a dose time string (e.g. "14:00"), returns the SMS send time
 * by subtracting `minutesBefore` (default 5).
 */
export function getSendTime(doseTime: string, minutesBefore = 5): string {
  const [hours, minutes] = doseTime.split(':').map(Number);
  const total = hours * 60 + minutes - minutesBefore;
  const h = Math.floor(((total % 1440) + 1440) % 1440 / 60);
  const m = ((total % 60) + 60) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Returns the full SMS payload for a scheduled dose.
 */
export function buildScheduledSms(params: {
  language: Language;
  doseTime: string;
  minutesBefore?: number;
  data: SmsTemplateData;
}): { sendAt: string; message: string } {
  const { language, doseTime, minutesBefore = 5, data } = params;
  return {
    sendAt: getSendTime(doseTime, minutesBefore),
    message: buildSmsMessage(language, data),
  };
}

/**
 * Loads saved SMS settings from localStorage.
 */
export function loadSmsSettings(): { language: Language; minutesBefore: number } {
  if (typeof window === 'undefined') return { language: 'kinyarwanda', minutesBefore: 5 };
  const language = (localStorage.getItem('sms_language') as Language) || 'kinyarwanda';
  const minutesBefore = Number(localStorage.getItem('sms_minutes_before')) || 5;
  return { language, minutesBefore };
}