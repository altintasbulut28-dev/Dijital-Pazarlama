'use client';

import { useEffect, useState } from 'react';
import { supabase, statusConfig, type Lead, type Reminder } from '@/lib/supabase';
import {
  Users,
  Flame,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  Clock,
  Bell,
  CheckCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reminders, setReminders] = useState<(Reminder & { lead_name?: string; lead_id_ref?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    const { data: leadsData, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && leadsData) {
      setLeads(leadsData as Lead[]);
    }

    // Bugün ve yarına ait tamamlanmamış hatırlatmaları çek
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 2);

    const { data: reminderData } = await supabase
      .from('reminders')
      .select('*')
      .eq('is_completed', false)
      .gte('reminder_date', today.toISOString())
      .lte('reminder_date', tomorrow.toISOString())
      .order('reminder_date', { ascending: true });

    if (reminderData && leadsData) {
      const enriched = reminderData.map((r: Reminder) => {
        const lead = (leadsData as Lead[]).find(l => l.id === r.lead_id);
        return { ...r, lead_name: lead?.full_name, lead_id_ref: lead?.id };
      });
      setReminders(enriched);
    }

    setLoading(false);
  }

  async function completeReminder(reminderId: string) {
    await supabase.from('reminders').update({ is_completed: true }).eq('id', reminderId);
    setReminders(prev => prev.filter(r => r.id !== reminderId));
  }

  const wonDeals = leads.filter((l) => l.status === 'kazanildi');
  const appointments = leads.filter((l) => l.status === 'randevu');

  const totalCommission = wonDeals.reduce((sum, l) => {
    const val = l.estimated_value || 0;
    const rate = l.commission_rate || 0.02;
    return sum + val * rate;
  }, 0);

  const recentLeads = leads.slice(0, 5);

  const metrics = [
    {
      icon: CalendarCheck,
      label: 'Randevular',
      value: appointments.length,
      color: 'warm',
      accent: 'var(--warm)',
    },
    {
      icon: TrendingUp,
      label: 'Kazanılan Komisyon',
      value: `${(totalCommission / 1000).toFixed(0)}K₺`,
      color: 'success',
      accent: 'var(--success)',
    },
    {
      icon: Users,
      label: 'Toplam Lead',
      value: leads.length,
      color: 'purple',
      accent: 'var(--purple)',
    },
  ];

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Dashboard</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
        <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)', marginTop: 24 }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Apex OS — Genel bakış ve metrikler
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          <Clock size={14} />
          Son güncelleme: {new Date().toLocaleTimeString('tr-TR')}
        </div>
      </div>


      {/* Stat cards */}
      <div
        className="stagger-children"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 24,
        }}
      >
        {metrics.map((m, i) => (
          <div key={i} className={`metric-card ${m.color}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: `${m.accent}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <m.icon size={20} color={m.accent} />
              </div>
              <ArrowUpRight size={16} color="var(--text-muted)" />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.accent }}>{m.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bugünkü Hatırlatmalar */}
      {reminders.length > 0 && (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 24, borderLeft: '3px solid var(--warm)' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={18} color="var(--warm)" />
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Bugünkü & Yarınki Takipler ({reminders.length})</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {reminders.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                    {r.lead_name && (
                      <Link href={`/leads/${r.lead_id_ref}`} style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}>
                        {r.lead_name}
                      </Link>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.message}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {new Date(r.reminder_date).toLocaleString('tr-TR')}
                  </div>
                </div>
                <button
                  onClick={() => completeReminder(r.id)}
                  style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 8, padding: '6px 12px', color: 'var(--success)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
                >
                  <CheckCircle size={14} /> Tamam
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Two columns: recent leads + category breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Recent Leads */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Son Gelen Leadler</h2>
          </div>
          {recentLeads.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <Users size={40} style={{ marginBottom: 12, opacity: 0.3 }} />
              <p>Henüz lead yok</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Lead formu üzerinden ilk lead&apos;inizi ekleyin</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>İsim</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {recentLeads.map((lead) => {
                  const status = statusConfig[lead.status] || statusConfig.yeni;
                  return (
                    <tr key={lead.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{lead.full_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.phone}</div>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            background: `${status.color}15`,
                            color: status.color,
                          }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="glass-card" style={{ padding: 24 }}>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              Veri bekleniyor
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Status breakdown */}
              <div style={{ marginTop: 0 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)' }}>
                  Durum Dağılımı
                </h3>
                {Object.entries(statusConfig).map(([key, s]) => {
                  const count = leads.filter((l) => l.status === key).length;
                  return (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 0',
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: s.color,
                          }}
                        />
                        <span style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
