import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';

export function useNotifications() {
  const { user } = useAuthStore();

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }, []);

  const sendLocalNotification = useCallback((title: string, body: string, data?: any) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const notif = new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data,
      tag: data?.medication_id || 'medwise',
      requireInteraction: true,
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return notif;
  }, []);

  const scheduleReminders = useCallback(
    async (medications: any[]) => {
      if (!user) return;
      const now = new Date();

      medications.forEach((med) => {
        med.schedule_times?.forEach((time: string) => {
          const [hours, minutes] = time.split(':').map(Number);
          const reminderTime = new Date();
          reminderTime.setHours(hours, minutes, 0, 0);

          const delay = reminderTime.getTime() - now.getTime();
          if (delay > 0 && delay < 24 * 60 * 60 * 1000) {
            setTimeout(() => {
              sendLocalNotification(
                `💊 Time for ${med.medication?.name}`,
                `Take ${med.dosage} ${getFoodInstructionText(med.food_instruction)}`,
                { medication_id: med.medication_id, patient_medication_id: med.id }
              );

              // Repeat every 5 min until confirmed (max 3 times)
              let repeatCount = 0;
              const repeatInterval = setInterval(() => {
                if (repeatCount >= 2) {
                  clearInterval(repeatInterval);
                  return;
                }
                sendLocalNotification(
                  `⏰ Reminder: ${med.medication?.name}`,
                  `You haven't confirmed taking your medication yet.`,
                  { medication_id: med.medication_id }
                );
                repeatCount++;
              }, 5 * 60 * 1000);
            }, delay);
          }
        });
      });
    },
    [user, sendLocalNotification]
  );

  const scheduleAppointmentReminders = useCallback(
    (appointments: any[]) => {
      appointments.forEach((appt) => {
        const apptDateTime = new Date(`${appt.appointment_date}T${appt.appointment_time}`);
        const now = new Date();

        // 1 day before
        const dayBefore = new Date(apptDateTime.getTime() - 24 * 60 * 60 * 1000);
        const dayBeforeDelay = dayBefore.getTime() - now.getTime();
        if (dayBeforeDelay > 0 && dayBeforeDelay < 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            sendLocalNotification(
              `📅 Appointment Tomorrow`,
              `${appt.title} with ${appt.doctor_name} at ${appt.appointment_time}`,
              { appointment_id: appt.id }
            );
          }, dayBeforeDelay);
        }

        // 1 hour before
        const hourBefore = new Date(apptDateTime.getTime() - 60 * 60 * 1000);
        const hourBeforeDelay = hourBefore.getTime() - now.getTime();
        if (hourBeforeDelay > 0 && hourBeforeDelay < 24 * 60 * 60 * 1000) {
          setTimeout(() => {
            sendLocalNotification(
              `🏥 Appointment in 1 Hour`,
              `${appt.title} at ${appt.location || 'your doctor'}`,
              { appointment_id: appt.id }
            );
          }, hourBeforeDelay);
        }
      });
    },
    [sendLocalNotification]
  );

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  return {
    requestPermission,
    sendLocalNotification,
    scheduleReminders,
    scheduleAppointmentReminders,
  };
}

function getFoodInstructionText(instruction: string): string {
  const map: Record<string, string> = {
    before_food: 'before food',
    after_food: 'after food',
    with_food: 'with food',
    empty_stomach: 'on empty stomach',
  };
  return map[instruction] || '';
}
