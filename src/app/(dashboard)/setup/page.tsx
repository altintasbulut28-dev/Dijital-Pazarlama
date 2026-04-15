'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database, CheckCircle, AlertCircle, Copy, Play, RefreshCw } from 'lucide-react';

const SQL_SCHEMA = `-- =============================================
-- APEX OS 2.0 — Veritabanı Kurulumu
-- Bu SQL'i Supabase SQL Editor'da çalıştırın
-- =============================================

-- Mülk (Properties) tablosu
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  baslik TEXT NOT NULL,
  aciklama TEXT,
  fiyat NUMERIC,
  konum TEXT,
  oda_sayisi INTEGER,
  metrekare INTEGER,
  tip TEXT DEFAULT 'Daire',
  durum TEXT DEFAULT 'Aktif',
  fotograf_url TEXT,
  video_url TEXT,
  sunum_url TEXT,
  emlakci_adi TEXT,
  emlakci_telefon TEXT,
  komisyon_orani NUMERIC DEFAULT 2,
  agent_id UUID REFERENCES agents(id) ON DELETE SET NULL
);

-- Emlakçılar (Agents) tablosu
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Lead tablosu
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  budget TEXT,
  purpose TEXT,
  timeframe TEXT,
  score INTEGER DEFAULT 0,
  category TEXT DEFAULT 'soguk',
  status TEXT DEFAULT 'yeni',
  source TEXT,
  assigned_to UUID REFERENCES agents(id) ON DELETE SET NULL,
  estimated_value NUMERIC,
  commission_rate NUMERIC DEFAULT 0.02,
  tags TEXT[] DEFAULT '{}',
  notes_text TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
  property_baslik TEXT
);

-- Notlar tablosu
CREATE TABLE IF NOT EXISTS notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  note_type TEXT DEFAULT 'note',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hatırlatıcılar tablosu
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  reminder_date TIMESTAMPTZ NOT NULL,
  message TEXT,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS politikaları (Öncelikle eskileri silelim ki hata vermesin)
DO $$ 
BEGIN
  -- Varsa eski politikaları düşür
  DROP POLICY IF EXISTS "properties_all" ON properties;
  DROP POLICY IF EXISTS "leads_all" ON leads;
  DROP POLICY IF EXISTS "notes_all" ON notes;
  DROP POLICY IF EXISTS "reminders_all" ON reminders;
  DROP POLICY IF EXISTS "leads_insert" ON leads;
  DROP POLICY IF EXISTS "leads_select" ON leads;
  DROP POLICY IF EXISTS "leads_update" ON leads;
EXCEPTION
  WHEN undefined_object THEN null;
END $$;

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Politikalar (Herkes işlem yapabilir - basit demo)
CREATE POLICY "properties_all" ON properties FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "leads_all" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "notes_all" ON notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "reminders_all" ON reminders FOR ALL USING (true) WITH CHECK (true);

-- Mevcut database guncelleme (Eger tablolar onceden kuruluysa):
DO $$
BEGIN
  BEGIN
    ALTER TABLE leads ADD COLUMN property_id UUID REFERENCES properties(id) ON DELETE SET NULL;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;

  BEGIN
    ALTER TABLE leads ADD COLUMN property_baslik TEXT;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;

  BEGIN
    ALTER TABLE leads ADD COLUMN property_type TEXT;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;

  BEGIN
    ALTER TABLE leads ADD COLUMN rooms TEXT;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;

  BEGIN
    ALTER TABLE leads ADD COLUMN location_pref TEXT;
  EXCEPTION
    WHEN duplicate_column THEN null;
  END;
END $$;

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_property_id ON leads(property_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_reminders_lead_id ON reminders(lead_id);`;

const SAMPLE_DATA_SQL = `-- Örnek lead verileri
INSERT INTO leads (full_name, phone, email, budget, purpose, timeframe, status, source, estimated_value) VALUES
  ('Ahmet Yılmaz', '05321234567', 'ahmet@email.com', '5m_ustu', 'yatirim', 'hemen', 'yeni', 'meta_ads', 7500000),
  ('Ayşe Kara', '05339876543', 'ayse.kara@email.com', '2_5m', 'oturum', '3_ay', 'iletisimde', 'instagram', 3500000),
  ('Mehmet Can', '05351112233', null, '1_2m', 'oturum', '6_ay', 'yeni', 'website', 1500000),
  ('Fatma Demir', '05364445566', 'fatma@demir.com', '5m_ustu', 'yatirim', 'hemen', 'randevu', 'referans', 12000000),
  ('Ali Öztürk', '05377778899', 'ali.oz@email.com', '2_5m', 'yatirim', '3_ay', 'iletisimde', 'meta_ads', 4000000),
  ('Zeynep Arslan', '05380001122', null, '1m_alti', 'oturum', '1_yil_ustu', 'yeni', 'website', 800000),
  ('Burak Şahin', '05393334455', 'burak@sahin.com', '5m_ustu', 'yatirim', '3_ay', 'iletisimde', 'instagram', 9000000),
  ('Selin Yıldız', '05401234567', 'selin@yildiz.com', '2_5m', 'oturum', 'hemen', 'randevu', 'referans', 3000000),
  ('Emre Koç', '05412345678', null, '1_2m', 'yatirim', '6_ay', 'yeni', 'meta_ads', 1800000),
  ('Deniz Aydın', '05423456789', 'deniz@aydin.com', '5m_ustu', 'yatirim', 'hemen', 'kazanildi', 'referans', 15000000);`;

export default function SetupPage() {
  const [tableStatus, setTableStatus] = useState<Record<string, 'checking' | 'exists' | 'missing' | 'error'>>({});
  const [copied, setCopied] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);
  const [insertingData, setInsertingData] = useState(false);
  const [insertResult, setInsertResult] = useState<string | null>(null);

  async function checkTables() {
    const tables = ['agents', 'leads', 'notes', 'reminders', 'properties'];
    const newStatus: Record<string, 'checking' | 'exists' | 'missing' | 'error'> = {};

    for (const table of tables) {
      newStatus[table] = 'checking';
      setTableStatus({ ...newStatus });

      try {
        const { error } = await supabase.from(table).select('id').limit(1);
        if (error) {
          if (error.message.includes('does not exist') || error.message.includes('not found') || error.code === 'PGRST205') {
            newStatus[table] = 'missing';
          } else {
            newStatus[table] = 'exists';
          }
        } else {
          newStatus[table] = 'exists';
        }
      } catch {
        newStatus[table] = 'error';
      }
      setTableStatus({ ...newStatus });
    }
  }

  async function insertSampleData() {
    setInsertingData(true);
    setInsertResult(null);

    const sampleLeads = [
      { full_name: 'Ahmet Yılmaz', phone: '05321234567', email: 'ahmet@email.com', budget: '5m_ustu', purpose: 'yatirim', timeframe: 'hemen', status: 'yeni', source: 'meta_ads', estimated_value: 7500000, commission_rate: 0.02, tags: [] },
      { full_name: 'Ayşe Kara', phone: '05339876543', email: 'ayse.kara@email.com', budget: '2_5m', purpose: 'oturum', timeframe: '3_ay', status: 'iletisimde', source: 'instagram', estimated_value: 3500000, commission_rate: 0.02, tags: [] },
      { full_name: 'Mehmet Can', phone: '05351112233', email: null, budget: '1_2m', purpose: 'oturum', timeframe: '6_ay', status: 'yeni', source: 'website', estimated_value: 1500000, commission_rate: 0.02, tags: [] },
      { full_name: 'Fatma Demir', phone: '05364445566', email: 'fatma@demir.com', budget: '5m_ustu', purpose: 'yatirim', timeframe: 'hemen', status: 'randevu', source: 'referans', estimated_value: 12000000, commission_rate: 0.02, tags: [] },
      { full_name: 'Ali Öztürk', phone: '05377778899', email: 'ali.oz@email.com', budget: '2_5m', purpose: 'yatirim', timeframe: '3_ay', status: 'iletisimde', source: 'meta_ads', estimated_value: 4000000, commission_rate: 0.02, tags: [] },
      { full_name: 'Zeynep Arslan', phone: '05380001122', email: null, budget: '1m_alti', purpose: 'oturum', timeframe: '1_yil_ustu', status: 'yeni', source: 'website', estimated_value: 800000, commission_rate: 0.02, tags: [] },
      { full_name: 'Burak Şahin', phone: '05393334455', email: 'burak@sahin.com', budget: '5m_ustu', purpose: 'yatirim', timeframe: '3_ay', status: 'iletisimde', source: 'instagram', estimated_value: 9000000, commission_rate: 0.02, tags: [] },
      { full_name: 'Selin Yıldız', phone: '05401234567', email: 'selin@yildiz.com', budget: '2_5m', purpose: 'oturum', timeframe: 'hemen', status: 'randevu', source: 'referans', estimated_value: 3000000, commission_rate: 0.02, tags: [] },
      { full_name: 'Emre Koç', phone: '05412345678', email: null, budget: '1_2m', purpose: 'yatirim', timeframe: '6_ay', status: 'yeni', source: 'meta_ads', estimated_value: 1800000, commission_rate: 0.02, tags: [] },
      { full_name: 'Deniz Aydın', phone: '05423456789', email: 'deniz@aydin.com', budget: '5m_ustu', purpose: 'yatirim', timeframe: 'hemen', status: 'kazanildi', source: 'referans', estimated_value: 15000000, commission_rate: 0.02, tags: [] },
    ];

    const { error } = await supabase.from('leads').insert(sampleLeads);

    if (error) {
      setInsertResult('❌ Hata: ' + error.message);
    } else {
      setInsertResult('✅ 10 örnek lead başarıyla eklendi!');
    }
    setInsertingData(false);
  }

  function copyToClipboard(text: string, type: 'schema' | 'sample') {
    navigator.clipboard.writeText(text);
    if (type === 'schema') {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setCopiedSample(true);
      setTimeout(() => setCopiedSample(false), 2000);
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'exists': return <CheckCircle size={16} color="var(--success)" />;
      case 'missing': return <AlertCircle size={16} color="var(--hot)" />;
      case 'checking': return <RefreshCw size={16} color="var(--accent-gold)" style={{ animation: 'spin 1s linear infinite' }} />;
      default: return <AlertCircle size={16} color="var(--text-muted)" />;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Veritabanı Kurulumu</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Supabase tablolarını oluşturun ve sistemi çalışır hale getirin
        </p>
      </div>

      {/* Connection info */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Database size={18} color="var(--accent-gold)" />
          Bağlantı Durumu
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>SUPABASE URL</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              https://kenzsbokntqlrzxneund.supabase.co
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>API KEY</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
              sb_publishable_...yuyh4xI0
            </div>
          </div>
        </div>
      </div>

      {/* Table check */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Tablo Durumu</h2>
          <button className="btn-primary" onClick={checkTables} style={{ padding: '10px 20px' }}>
            <RefreshCw size={14} />
            Kontrol Et
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {['agents', 'leads', 'notes', 'reminders', 'properties'].map((table) => (
            <div
              key={table}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'var(--bg-glass)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 14 }}>{table}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {tableStatus[table] ? (
                  <>
                    {statusIcon(tableStatus[table])}
                    <span style={{ fontSize: 13, color: tableStatus[table] === 'exists' ? 'var(--success)' : tableStatus[table] === 'missing' ? 'var(--hot)' : 'var(--text-muted)' }}>
                      {tableStatus[table] === 'exists' && 'Mevcut ✓'}
                      {tableStatus[table] === 'missing' && 'Eksik — oluşturulmalı'}
                      {tableStatus[table] === 'checking' && 'Kontrol ediliyor...'}
                      {tableStatus[table] === 'error' && 'Hata'}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Kontrol edilmedi</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Schema */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Adım 1: Tabloları Oluştur</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Bu SQL&apos;i kopyalayıp Supabase SQL Editor&apos;a yapıştırın ve &quot;Run&quot; butonuna basın
            </p>
          </div>
          <button
            className="btn-secondary"
            onClick={() => copyToClipboard(SQL_SCHEMA, 'schema')}
          >
            <Copy size={14} />
            {copied ? 'Kopyalandı!' : 'SQL\'i Kopyala'}
          </button>
        </div>
        <div
          style={{
            background: '#0d1117',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            maxHeight: 400,
            overflow: 'auto',
          }}
        >
          <pre style={{ fontSize: 12, color: '#c9d1d9', lineHeight: 1.6, fontFamily: 'monospace', margin: 0, whiteSpace: 'pre-wrap' }}>
            {SQL_SCHEMA}
          </pre>
        </div>
      </div>

      {/* Sample Data */}
      <div className="glass-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Adım 2: Örnek Veri Ekle (Opsiyonel)</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Sistemi test etmek için 10 hazır lead ekleyin
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn-secondary"
              onClick={() => copyToClipboard(SAMPLE_DATA_SQL, 'sample')}
            >
              <Copy size={14} />
              {copiedSample ? 'Kopyalandı!' : 'SQL Kopyala'}
            </button>
            <button
              className="btn-primary"
              onClick={insertSampleData}
              disabled={insertingData}
              style={{ opacity: insertingData ? 0.5 : 1 }}
            >
              <Play size={14} />
              {insertingData ? 'Ekleniyor...' : 'API ile Ekle'}
            </button>
          </div>
        </div>
        {insertResult && (
          <div
            style={{
              padding: '12px 16px',
              background: insertResult.includes('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${insertResult.includes('✅') ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
              fontSize: 14,
              color: insertResult.includes('✅') ? 'var(--success)' : 'var(--hot)',
            }}
          >
            {insertResult}
          </div>
        )}
      </div>
    </div>
  );
}
