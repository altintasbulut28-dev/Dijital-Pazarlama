'use client';

import { useEffect, useState } from 'react';
import { supabase, statusConfig, type Lead } from '@/lib/supabase';
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';

export default function AnalyticsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  }

  const wonDeals = leads.filter((l) => l.status === 'kazanildi');
  const appointments = leads.filter((l) => l.status === 'randevu');
  const inContact = leads.filter((l) => l.status === 'iletisimde');
  const lostDeals = leads.filter((l) => l.status === 'kayip');

  const totalCommission = wonDeals.reduce((sum, l) => sum + (l.estimated_value || 0) * (l.commission_rate || 0.02), 0);
  const pipelineValue = inContact.reduce((sum, l) => sum + (l.estimated_value || 0) * (l.commission_rate || 0.02), 0);

  const conversionRate = leads.length > 0 ? ((wonDeals.length / leads.length) * 100).toFixed(1) : '0';
  const appointmentRate = leads.length > 0 ? ((appointments.length / leads.length) * 100).toFixed(1) : '0';

  // Status bar data
  const statusData = Object.entries(statusConfig).map(([key, s]) => ({
    name: s.label,
    value: leads.filter((l) => l.status === key).length,
    fill: s.color,
  }));

  // Funnel data
  const funnelSteps = [
    { label: 'Toplam Lead', count: leads.length, color: 'var(--purple)', icon: Users },
    { label: 'İletişimde', count: inContact.length, color: 'var(--orange)', icon: Target },
    { label: 'Randevu', count: appointments.length, color: 'var(--cyan)', icon: BarChart3 },
    { label: 'Kazanıldı', count: wonDeals.length, color: 'var(--success)', icon: DollarSign },
  ];

  // Source analysis
  const sourceMap: Record<string, number> = {};
  leads.forEach((l) => {
    const src = l.source || 'bilinmiyor';
    sourceMap[src] = (sourceMap[src] || 0) + 1;
  });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>ROI Analiz</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>ROI Analiz</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Performans metrikleri ve dönüşüm analizi</p>
      </div>

      {/* KPI Row */}
      <div
        className="stagger-children"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}
      >
        {[
          { label: 'Kazanılan Komisyon', value: `${(totalCommission / 1000).toFixed(0)}K₺`, icon: DollarSign, color: 'var(--success)', accent: 'success' },
          { label: 'Pipeline Değeri', value: `${(pipelineValue / 1000).toFixed(0)}K₺`, icon: TrendingUp, color: 'var(--accent-gold)', accent: 'gold' },
          { label: 'Dönüşüm Oranı', value: `%${conversionRate}`, icon: Target, color: 'var(--cyan)', accent: 'purple' },
          { label: 'Randevu Oranı', value: `%${appointmentRate}`, icon: BarChart3, color: 'var(--orange)', accent: 'warm' },
        ].map((m, i) => (
          <div key={i} className={`metric-card ${m.accent}`}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <m.icon size={20} color={m.color} />
              </div>
              <ArrowUpRight size={16} color="var(--text-muted)" />
            </div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color }}>{m.value}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{m.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 24 }}>
          📊 Dönüşüm Hunisi: Lead → Randevu → Satış
        </h2>
        {leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Huni verisi için lead eklemelisiniz
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end' }}>
            {funnelSteps.map((step, i) => {
              const maxCount = Math.max(...funnelSteps.map((s) => s.count), 1);
              const width = `${100 / funnelSteps.length}%`;
              const height = Math.max((step.count / maxCount) * 200, 40);
              const FIcon = step.icon;
              return (
                <div key={i} style={{ width, textAlign: 'center', padding: '0 8px' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: step.color, marginBottom: 8 }}>
                    {step.count}
                  </div>
                  <div
                    style={{
                      height,
                      background: `${step.color}20`,
                      borderRadius: '8px 8px 0 0',
                      border: `1px solid ${step.color}30`,
                      borderBottom: `3px solid ${step.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'height 0.6s ease',
                    }}
                  >
                    <FIcon size={20} color={step.color} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 8 }}>
                    {step.label}
                  </div>
                  {i < funnelSteps.length - 1 && funnelSteps[i].count > 0 && (
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {((funnelSteps[i + 1].count / funnelSteps[i].count) * 100).toFixed(0)}%
                      <ArrowDownRight size={10} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Status Bar */}
        <div className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Durum Dağılımı</h2>
          {leads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={statusData}>
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                />
                <YAxis
                  tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 8,
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Source analysis */}
      {sourceData.length > 0 && (
        <div className="glass-card" style={{ padding: 28, marginTop: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Kaynak Analizi</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
            {sourceData.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: 20,
                  background: 'var(--bg-glass)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-gold)' }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4, textTransform: 'capitalize' }}>
                  {s.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
