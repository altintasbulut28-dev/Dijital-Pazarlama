'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, budgetLabels, purposeLabels, type Property } from '@/lib/supabase';
import { Crown, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

const steps = [
  { id: 'personal',  title: 'İletişim Bilgileri',      subtitle: 'Sizi nasıl arayalım?' },
  { id: 'budget',    title: 'Bütçe Aralığınız',         subtitle: 'Planlanan yatırım miktarı' },
];

const SelectCard = ({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    style={{
      padding: '16px',
      background: selected ? 'rgba(212,168,83,0.12)' : 'var(--bg-glass)',
      border: `1px solid ${selected ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-md)',
      color: selected ? 'var(--accent-gold)' : 'var(--text-secondary)',
      fontWeight: selected ? 700 : 500,
      cursor: 'pointer',
      transition: 'all 0.2s',
      textAlign: 'center' as const,
      fontSize: 14,
      fontFamily: 'inherit',
      width: '100%',
    }}
  >
    {children}
  </button>
);

export default function LeadFormPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ leadId?: string } | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [assignedAgent, setAssignedAgent] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const mulkId = searchParams.get('mulk');
    const agentId = searchParams.get('agent');

    if (mulkId) {
      async function fetchProp() {
        const { data } = await supabase.from('properties').select('*').eq('id', mulkId).single();
        if (data) setProperty(data as Property);
      }
      fetchProp();
    }

    if (agentId) {
      setAssignedAgent(agentId);
    }
  }, []);

  const [form, setForm] = useState({
    full_name: '',
    phone: '',
    email: '',
    budget: '',
    purpose: '',
    source: 'website',
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    if (step === 0) return form.full_name.trim().length > 0 && form.phone.trim().length > 0 && form.email.trim().length > 0;
    if (step === 1) return form.budget !== '';
    return false;
  };

  const handleSubmit = async () => {
    setSubmitting(true);

    const leadData: Record<string, unknown> = {
      full_name: form.full_name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || null,
      property_type: null,
      rooms: null,
      location_pref: null,
      budget: form.budget,
      purpose: form.purpose || 'belirtilmedi',
      timeframe: '',
      status: 'yeni',
      source: form.source,
      commission_rate: 0.02,
      tags: [],
      assigned_to: assignedAgent || null,
    };

    if (property?.id) {
      leadData.property_id = property.id;
      leadData.property_baslik = property.baslik;
    }

    console.log('Gönderilen veri:', leadData);

    const { data: inserted, error } = await supabase.from('leads').insert([leadData]).select();

    if (!error) {
      const insertedLeadId = inserted?.[0]?.id;

      if (typeof window !== 'undefined' && insertedLeadId) {
        localStorage.setItem('apex_lead_id', insertedLeadId);
      }

      if (insertedLeadId) {
        const now = new Date();
        const reminders = [
          {
            lead_id: insertedLeadId,
            reminder_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            message: `2. gün takibi: ${form.full_name.trim()} — Sunumu gördü mü? Geri bildirim al.`,
            is_completed: false,
          },
          {
            lead_id: insertedLeadId,
            reminder_date: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
            message: `4. gün takibi: ${form.full_name.trim()} — Randevu aldı mı? Almadıysa farklı mülk öner.`,
            is_completed: false,
          },
          {
            lead_id: insertedLeadId,
            reminder_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            message: `7. gün takibi: ${form.full_name.trim()} — Son deneme. Bütçe veya tercih değişti mi?`,
            is_completed: false,
          },
        ];
        await supabase.from('reminders').insert(reminders);
      }

      // Mülk varsa direkt sunuma yönlendir, yoksa teşekkür ekranı göster
      if (property?.id && insertedLeadId) {
        router.push(`/presentation/${property.id}?lead=${insertedLeadId}`);
        return;
      }

      setResult({ leadId: insertedLeadId });
      setSubmitted(true);
    } else {
      alert('Lead kaydedilemedi. Lütfen veritabanı kurulumunu kontrol edin. Hata: ' + error.message);
    }
    setSubmitting(false);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (submitted && result) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div className="glass-card animate-fadeInUp" style={{ padding: 48, maxWidth: 500, width: '100%', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <CheckCircle size={36} color="#22c55e" />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Teşekkür Ederiz!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, lineHeight: 1.7 }}>
            {property
              ? 'Tercihlerinize uygun mülk sunumunuz otomatik olarak hazırlandı. Lütfen inceleyin.'
              : 'Formu başarıyla aldık. En kısa sürede sizinle iletişime geçeceğiz.'}
          </p>
          {property && result.leadId && (
            <button
              onClick={() => router.push(`/presentation/${property.id}?lead=${result.leadId}`)}
              className="btn-primary"
              style={{ padding: '16px 32px', fontSize: 16, marginBottom: 24, width: '100%', justifyContent: 'center' }}
            >
              <Sparkles size={18} />
              Özel Sunumu İncele
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Ambient orb */}
      <div style={{ position: 'absolute', top: '5%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,168,83,0.05) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: 580, width: '100%', zIndex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={18} color="#0a0e1a" />
            </div>
            <span className="gold-text" style={{ fontSize: 18, fontWeight: 800, letterSpacing: '1px' }}>APEX OS</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
            {property ? property.baslik : 'Lüks Gayrimenkul Danışmanlığı'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            {property
              ? `${property.fiyat ? property.fiyat.toLocaleString('tr-TR') + ' ₺ | ' : ''}${property.konum || ''}`
              : 'Hayalinizdeki mülkü bulmak için bilgilerinizi paylaşın'}
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 32 }}>
          {steps.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className={`step-dot ${i === step ? 'active' : i < step ? 'completed' : ''}`} />
              {i < steps.length - 1 && (
                <div style={{ width: 32, height: 2, background: i < step ? 'var(--success)' : 'var(--border-subtle)', borderRadius: 1, transition: 'background 0.3s' }} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="glass-card" style={{ padding: 36 }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>{steps[step].title}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{steps[step].subtitle}</p>
          </div>

          {/* Step 0: Personal */}
          {step === 0 && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Ad Soyad *</label>
                <input className="input-field" placeholder="Örn: Ahmet Yılmaz" value={form.full_name} onChange={(e) => updateField('full_name', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Telefon *</label>
                <input className="input-field" placeholder="05XX XXX XX XX" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>E-posta *</label>
                <input className="input-field" type="email" placeholder="ornek@email.com" value={form.email} onChange={(e) => updateField('email', e.target.value)} />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nereden duydunuz? (Opsiyonel)</label>
                <select className="select-field" value={form.source} onChange={(e) => updateField('source', e.target.value)}>
                  <option value="website">Website</option>
                  <option value="instagram">Instagram</option>
                  <option value="meta_ads">Reklam</option>
                  <option value="referans">Referans</option>
                  <option value="manuel">Diğer</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 1: Budget */}
          {step === 1 && (
            <div className="animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(budgetLabels).map(([val, label]) => (
                    <SelectCard key={val} selected={form.budget === val} onClick={() => updateField('budget', val)}>
                      {label}
                    </SelectCard>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
                  Yatırım mı, oturum mu? <span style={{ fontWeight: 400, opacity: 0.6 }}>(Opsiyonel)</span>
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {Object.entries(purposeLabels).map(([val, label]) => (
                    <SelectCard key={val} selected={form.purpose === val} onClick={() => updateField('purpose', form.purpose === val ? '' : val)}>
                      {label}
                    </SelectCard>
                  ))}
                </div>
              </div>
            </div>
          )}


          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: step === 0 ? 'flex-end' : 'space-between', marginTop: 32 }}>
            {step > 0 && (
              <button className="btn-secondary" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={16} />
                Geri
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                className="btn-primary"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
                style={{ opacity: canProceed() ? 1 : 0.5 }}
              >
                Devam
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="btn-primary"
                disabled={!canProceed() || submitting}
                onClick={handleSubmit}
                style={{ opacity: canProceed() && !submitting ? 1 : 0.5 }}
              >
                {submitting ? 'Gönderiliyor...' : (
                  <>
                    <Sparkles size={16} />
                    Formu Gönder
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Progress text */}
        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          Adım {step + 1} / {steps.length}
        </p>
      </div>
    </div>
  );
}
