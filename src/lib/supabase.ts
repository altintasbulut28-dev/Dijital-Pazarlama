import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kenzsbokntqlrzxneund.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_zEr9bXRSOh45vH12sw4g1Q_yuyh4xI0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Lead {
  id: string;
  created_at: string;
  updated_at: string;
  full_name: string;
  phone: string;
  email: string | null;
  property_type: string | null;
  rooms: string | null;
  location_pref: string | null;
  budget: string;
  purpose: string;
  timeframe: string;
  status: 'yeni' | 'iletisimde' | 'randevu' | 'kazanildi' | 'kayip';
  source: string;
  assigned_to: string | null;
  estimated_value: number | null;
  commission_rate: number;
  tags: string[];
  notes_text: string | null;
  property_id: string | null;
  property_baslik: string | null;
}

export interface Property {
  id: string;
  created_at: string;
  baslik: string;
  aciklama: string | null;
  fiyat: number | null;
  konum: string | null;
  oda_sayisi: number | null;
  metrekare: number | null;
  tip: string;
  durum: string;
  fotograf_url: string | null;
  video_url: string | null;
  sunum_url: string | null;
  emlakci_adi: string | null;
  emlakci_telefon: string | null;
  komisyon_orani: number;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  note_type: 'note' | 'call' | 'meeting' | 'email' | 'status_change';
  created_at: string;
}

export interface Reminder {
  id: string;
  lead_id: string;
  reminder_date: string;
  message: string;
  is_completed: boolean;
  created_at: string;
}

export interface Agent {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  password: string | null;
}


// Category display helpers
export const categoryConfig = {
  sicak: { label: '🔥 Sıcak', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  ilik: { label: '🟡 Ilık', color: '#eab308', bg: 'rgba(234,179,8,0.15)' },
  soguk: { label: '❄️ Soğuk', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
};

export const statusConfig: Record<string, { label: string; color: string }> = {
  yeni: { label: 'Yeni', color: '#8b5cf6' },
  iletisimde: { label: 'İletişimde', color: '#f97316' },
  randevu: { label: 'Randevu', color: '#06b6d4' },
  kazanildi: { label: 'Kazanıldı', color: '#22c55e' },
  kayip: { label: 'Kayıp', color: '#6b7280' },
};

export const budgetLabels: Record<string, string> = {
  '5m': '5 Milyon ₺',
  '15m': '15 Milyon ₺',
  '30m_ustu': '30 Milyon ₺ ve Üstü',
};

export const purposeLabels: Record<string,string> = {
  yatirim: '📈 Yatırım',
  oturum: '🏠 Oturum',
};

export const timeframeLabels: Record<string,string> = {
  hemen: '⚡ Hemen',
  '1_3_ay': '📅 1 – 3 Ay',
  '6_ay_ustu': '🕐 6 Ay+',
};
