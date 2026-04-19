export type UserRole = 'patient' | 'pharmacist' | 'admin';
export type SafetyLevel = 'green' | 'yellow' | 'red';
export type FoodInstruction = 'before_food' | 'after_food' | 'with_food' | 'empty_stomach';
export type LogStatus = 'taken' | 'skipped' | 'pending';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'missed';
export type RecordType = 'prescription' | 'lab_result' | 'scan' | 'report' | 'other';

export interface User {
  id: string;
  phone: string;
  role: UserRole;
  full_name?: string;
  date_of_birth?: string;
  blood_type?: string;
  allergies?: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Medication {
  id: string;
  name: string;
  generic_name?: string;
  description?: string;
  category?: string;
  restrictions?: string[];
  warnings?: string[];
  interactions?: string[];
  safety_level: SafetyLevel;
  manufacturer?: string;
  created_by?: string;
  created_at?: string;
}

export interface PatientMedication {
  id: string;
  user_id: string;
  medication_id: string;
  medication?: Medication;
  dosage: string;
  schedule_times: string[];
  food_instruction: FoodInstruction;
  start_date: string;
  end_date?: string;
  days_of_week: string[];
  is_active: boolean;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Log {
  id: string;
  user_id: string;
  medication_id: string;
  patient_medication_id: string;
  medication?: { name: string };
  status: LogStatus;
  scheduled_time: string;
  actual_time?: string;
  notes?: string;
  created_at?: string;
}

export interface Appointment {
  id: string;
  user_id: string;
  title: string;
  doctor_name?: string;
  specialty?: string;
  appointment_date: string;
  appointment_time: string;
  location?: string;
  address?: string;
  notes?: string;
  status: AppointmentStatus;
  reminder_sent_day_before?: boolean;
  reminder_sent_hour_before?: boolean;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MedicalRecord {
  id: string;
  user_id: string;
  title: string;
  record_type: RecordType;
  file_url: string;
  file_name: string;
  file_type: 'image' | 'pdf' | 'other';
  doctor_name?: string;
  record_date?: string;
  description?: string;
  uploaded_at?: string;
}

export interface EmergencyAlert {
  id: string;
  user_id: string;
  location_lat?: number;
  location_lng?: number;
  status: 'active' | 'resolved';
  created_at?: string;
}

export interface AdherenceStats {
  taken: number;
  skipped: number;
  pending: number;
  total: number;
  rate: number;
}

export interface DashboardData {
  totalPatients: number;
  totalMedications: number;
  missedDosesToday: number;
  avgAdherence: number;
  appointmentsToday: number;
  emergencyAlerts: number;
}