'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, budgetLabels, type Lead } from '@/lib/supabase';
import { LogOut, Users, Calendar, Phone, CheckCircle, MessageSquare, PhoneCall, Bell, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_PIPELINE: { key: Lead['status']; label: string; color: string; nextLabel?: string; nextStatus?: Lead['status'] }[] = [
  { key: 'yeni',        label: 'Yeni Başvuru',      color: '#8b5cf6', nextLabel: 'İletişime Geç', nextStatus: 'iletisimde' },
  { key: 'iletisimde',  label: 'İletişimde',        color: '#f97316', nextLabel: 'Randevu Al',    nextStatus: 'randevu'    },
  { key: 'randevu',     label: 'Randevu Onaylandı', color: '#06b6d4', nextLabel: 'Satışa Taşı',  nextStatus: 'kazanildi'  },
  { key: 'kazanildi',   label: 'Satış Gerçekleşti', color: '#d4a853'                                                       },
  { key: 'kayip',       label: 'Kayıp',             color: '#6b7280'                                                       },
];

function getMonthlyData(leads: Lead[]) {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: i === 5 ? 'Bu Ay' : d.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', ''),
      value: leads.filter(l => {
        const c = new Date(l.created_at);
        return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
      }).length,
    };
  });
}

function useWindowWidth() {
  const [width, setWidth] = useState(390);
  useEffect(() => {
    setWidth(window.innerWidth);
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

export default function AgentPortal() {
  const router = useRouter();
  const width = useWindowWidth();
  const isMobile = width < 768;

  const [userName, setUserName] = useState('');
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newLeadNotif, setNewLeadNotif] = useState<Lead | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'appointments'>('leads');

  useEffect(() => {
    const role = localStorage.getItem('apex_role');
    if (role !== 'agent') { router.push('/'); return; }

    const name = localStorage.getItem('agent_name') || localStorage.getItem('agent_email') || 'Emlakçı';
    const agentId = localStorage.getItem('agent_id') || '';
    setUserName(name);

    let latestDate = new Date().toISOString();
    let interval: ReturnType<typeof setInterval>;

    async function loadLeads() {
      const { data: leadsData } = await supabase
        .from('leads').select('*').eq('assigned_to', agentId).order('created_at', { ascending: false });

      const leads = (leadsData as Lead[]) || [];
      setMyLeads(leads);
      if (leads.length > 0) {
        latestDate = leads[0].created_at;
        const { data: reminderData } = await supabase
          .from('reminders').select('*')
          .in('lead_id', leads.map(l => l.id))
          .eq('is_completed', false)
          .order('reminder_date', { ascending: true });
        if (reminderData) setAppointments(reminderData);
      }
      setLoading(false);
    }

    loadLeads().then(() => {
      interval = setInterval(async () => {
        const { data: newLeads } = await supabase
          .from('leads').select('*').eq('assigned_to', agentId)
          .gt('created_at', latestDate).order('created_at', { ascending: false });

        if (newLeads && newLeads.length > 0) {
          latestDate = newLeads[0].created_at;
          setMyLeads(prev => [...(newLeads as Lead[]), ...prev]);
          setNewLeadNotif(newLeads[0] as Lead);
          setTimeout(() => setNewLeadNotif(null), 6000);
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.setValueAtTime(680, ctx.currentTime + 0.12);
            osc.frequency.setValueAtTime(520, ctx.currentTime + 0.24);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(); osc.stop(ctx.currentTime + 0.5);
          } catch {}
        }
      }, 5000);
    });
    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('apex_role');
    localStorage.removeItem('agent_id');
    localStorage.removeItem('agent_email');
    localStorage.removeItem('agent_name');
    router.push('/');
  };

  const updateStatus = async (id: string, newStatus: Lead['status']) => {
    setUpdatingId(id);
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    setMyLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    setUpdatingId(null);
  };

  const chartData = getMonthlyData(myLeads);
  const maxChart = Math.max(...chartData.map(d => d.value), 1);
  const bookedApts = appointments
    .filter(a => a.message.includes('Gösterimi') && new Date(a.reminder_date) >= new Date())
    .sort((a, b) => new Date(a.reminder_date).getTime() - new Date(b.reminder_date).getTime());

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div className="skeleton" style={{ width: 50, height: 50, borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: isMobile ? 80 : 0 }}>

      {/* Bildirim */}
      {newLeadNotif && (
        <div style={{
          position: 'fixed', top: isMobile ? 12 : 24, right: isMobile ? 12 : 24, left: isMobile ? 12 : 'auto',
          zIndex: 9999, background: 'linear-gradient(135deg, #0a1128, #111827)',
          border: '1px solid var(--accent-gold)', borderRadius: 16,
          padding: '16px 20px', boxShadow: '0 8px 32px rgba(212,168,83,0.25)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={16} color="var(--accent-gold)" />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 700 }}>YENİ MÜŞTERİ</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{newLeadNotif.full_name}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>📞 {newLeadNotif.phone}</div>
        </div>
      )}

      {/* Navbar */}
      <header style={{
        background: '#0a1128', borderBottom: '1px solid var(--border-subtle)',
        padding: isMobile ? '14px 16px' : '20px 40px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: 'var(--accent-gold)', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Danışman Portalı</div>
            <div style={{ fontWeight: 700, color: '#fff', fontSize: isMobile ? 14 : 16 }}>{userName}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: isMobile ? '6px 12px' : '8px 16px', fontSize: 12, gap: 6 }}>
          <LogOut size={14} /> {isMobile ? '' : 'Çıkış Yap'}
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '16px 12px' : '40px 24px' }}>

        {/* KPI Kartları */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: isMobile ? 8 : 16, marginBottom: isMobile ? 16 : 32 }}>
          {[
            { icon: <Users size={isMobile ? 16 : 20} color="var(--accent-gold)" />, label: 'Toplam', value: myLeads.length, accent: 'var(--accent-gold)' },
            { icon: <Calendar size={isMobile ? 16 : 20} color="var(--success)" />, label: 'Randevu', value: myLeads.filter(l => l.status === 'randevu').length, accent: 'var(--success)' },
            { icon: <CheckCircle size={isMobile ? 16 : 20} color="#d4a853" />, label: 'Kazanılan', value: myLeads.filter(l => l.status === 'kazanildi').length, accent: '#d4a853' },
          ].map((kpi, i) => (
            <div key={i} className="glass-card" style={{ padding: isMobile ? '12px 10px' : 20, borderTop: `3px solid ${kpi.accent}`, textAlign: 'center' }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>{kpi.icon}</div>
              <div style={{ fontSize: isMobile ? 22 : 32, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
              <div style={{ fontSize: isMobile ? 10 : 13, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Mobil Tab Switcher */}
        {isMobile && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              onClick={() => setActiveTab('leads')}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === 'leads' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                color: activeTab === 'leads' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              }}
            >
              Müşteriler ({myLeads.length})
            </button>
            <button
              onClick={() => setActiveTab('appointments')}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: activeTab === 'appointments' ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
                color: activeTab === 'appointments' ? '#000' : 'var(--text-secondary)',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              }}
            >
              Randevular ({bookedApts.length})
            </button>
          </div>
        )}

        {/* Desktop Layout */}
        {!isMobile && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Chart */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600 }}>Aylık Lead Akışı</h2>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Son 6 Ay</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
                  {chartData.map((d, i) => {
                    const isCurrent = i === chartData.length - 1;
                    const h = Math.max((d.value / maxChart) * 100, d.value === 0 ? 4 : 0);
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, color: isCurrent ? 'var(--accent-gold)' : 'var(--text-muted)' }}>{d.value}</span>
                        <div style={{ width: '100%', height: `${h}%`, background: isCurrent ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                        <span style={{ fontSize: 11, color: isCurrent ? '#fff' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>{d.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Desktop Tablo */}
              <DesktopLeadTable leads={myLeads} appointments={appointments} updatingId={updatingId} updateStatus={updateStatus} />
            </div>
            <AppointmentsPanel bookedApts={bookedApts} myLeads={myLeads} />
          </div>
        )}

        {/* Mobil: Müşteriler */}
        {isMobile && activeTab === 'leads' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myLeads.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <Users size={32} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                <p>Henüz müşteri yok.</p>
              </div>
            ) : myLeads.map(lead => {
              const pipeline = STATUS_PIPELINE.find(s => s.key === lead.status);
              const isUpdating = updatingId === lead.id;
              const apt = appointments.find(a => a.lead_id === lead.id && a.message.includes('Gösterimi'));
              const isExpanded = expandedLead === lead.id;

              return (
                <div key={lead.id} className="glass-card" style={{ padding: 0, overflow: 'hidden', borderLeft: `3px solid ${pipeline?.color || 'var(--border-subtle)'}` }}>
                  {/* Kart Başlığı — her zaman görünür */}
                  <div
                    onClick={() => setExpandedLead(isExpanded ? null : lead.id)}
                    style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, color: '#fff', fontSize: 15, marginBottom: 2 }}>{lead.full_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: `${pipeline?.color}22`, color: pipeline?.color }}>
                          {pipeline?.label}
                        </span>
                        {apt && <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>✅ Randevu</span>}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
                  </div>

                  {/* Genişletilmiş içerik */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* Detaylar */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Telefon</div>
                          <div style={{ fontSize: 13, color: '#fff' }}>{lead.phone}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Bütçe</div>
                          <div style={{ fontSize: 13, color: '#fff' }}>{budgetLabels[lead.budget] || lead.budget}</div>
                        </div>
                        {lead.property_baslik && (
                          <div style={{ gridColumn: '1/-1' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>İlgilendiği Ev</div>
                            <div style={{ fontSize: 13, color: 'var(--accent-gold)', fontWeight: 600 }}>🏠 {lead.property_baslik}</div>
                          </div>
                        )}
                        {apt && (
                          <div style={{ gridColumn: '1/-1', background: 'rgba(34,197,94,0.08)', borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>✅ Randevu Bilgisi</div>
                            <div style={{ fontSize: 13, color: '#fff' }}>
                              📅 {new Date(apt.reminder_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}
                            </div>
                            <div style={{ fontSize: 13, color: '#fff' }}>
                              ⏰ {new Date(apt.reminder_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Aksiyonlar */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <a href={`tel:${lead.phone}`} className="btn-secondary" style={{ justifyContent: 'center', padding: '10px', fontSize: 13, gap: 6 }}>
                          <Phone size={15} /> Ara
                        </a>
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ justifyContent: 'center', padding: '10px', fontSize: 13, gap: 6 }}>
                          <MessageSquare size={15} /> WhatsApp
                        </a>
                        {pipeline?.nextStatus && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(lead.id, pipeline.nextStatus!)}
                            className="btn-primary"
                            style={{ gridColumn: '1/-1', padding: '12px', fontSize: 13, justifyContent: 'center', opacity: isUpdating ? 0.5 : 1 }}
                          >
                            {isUpdating ? 'Güncelleniyor...' : `→ ${pipeline.nextLabel}`}
                          </button>
                        )}
                        {lead.status !== 'kazanildi' && lead.status !== 'kayip' && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(lead.id, 'kayip')}
                            style={{ gridColumn: pipeline?.nextStatus ? 'auto' : '1/-1', padding: '10px', fontSize: 12, background: 'none', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 'var(--radius-sm)', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            Kayıp İşaretle
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Mobil: Randevular */}
        {isMobile && activeTab === 'appointments' && (
          <AppointmentsPanel bookedApts={bookedApts} myLeads={myLeads} />
        )}
      </div>
    </div>
  );
}

function DesktopLeadTable({ leads, appointments, updatingId, updateStatus }: {
  leads: Lead[];
  appointments: any[];
  updatingId: string | null;
  updateStatus: (id: string, status: Lead['status']) => void;
}) {
  return (
    <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>Müşteri Listem</h2>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 10 }}>{leads.length} kayıt</span>
      </div>
      {leads.length === 0 ? (
        <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Users size={32} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
          <p>Henüz müşteri yok.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12 }}>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>MÜŞTERİ</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>İLGİLENDİĞİ EV</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>RANDEVU</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>DURUM</th>
                <th style={{ padding: '12px 20px', fontWeight: 600 }}>İŞLEM</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => {
                const pipeline = STATUS_PIPELINE.find(s => s.key === lead.status);
                const isUpdating = updatingId === lead.id;
                const apt = appointments.find(a => a.lead_id === lead.id && a.message.includes('Gösterimi'));
                return (
                  <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ fontWeight: 600, color: '#fff', marginBottom: 2 }}>{lead.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.phone}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>💰 {budgetLabels[lead.budget] || lead.budget}</div>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {lead.property_baslik
                        ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-gold)' }}>🏠 {lead.property_baslik}</div>
                        : <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Belirtilmemiş</div>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      {apt ? (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>✅ Randevu Var</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>📅 {new Date(apt.reminder_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>⏰ {new Date(apt.reminder_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ) : <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>— Randevu Yok</div>}
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 16, background: `${pipeline?.color}18`, color: pipeline?.color || 'var(--text-muted)' }}>
                        {pipeline?.label || lead.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <a href={`tel:${lead.phone}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, gap: 4 }}><Phone size={12} /> Ara</a>
                        <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, gap: 4 }}><MessageSquare size={12} /> WA</a>
                        {pipeline?.nextStatus && (
                          <button disabled={isUpdating} onClick={() => updateStatus(lead.id, pipeline.nextStatus!)} className="btn-primary" style={{ padding: '5px 10px', fontSize: 11, opacity: isUpdating ? 0.5 : 1 }}>
                            {isUpdating ? '...' : pipeline.nextLabel}
                          </button>
                        )}
                        {lead.status !== 'kazanildi' && lead.status !== 'kayip' && (
                          <button disabled={isUpdating} onClick={() => updateStatus(lead.id, 'kayip')} style={{ padding: '5px 10px', fontSize: 11, background: 'none', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 'var(--radius-sm)', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                            Kayıp
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AppointmentsPanel({ bookedApts, myLeads }: { bookedApts: any[]; myLeads: Lead[] }) {
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Calendar size={15} color="var(--accent-gold)" /> Müşteri Randevuları
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {bookedApts.length === 0 ? (
          <div className="glass-card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
            <Calendar size={28} style={{ opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13 }}>Henüz randevu alınmamış.</p>
          </div>
        ) : bookedApts.map(apt => {
          const aptLead = myLeads.find(l => l.id === apt.lead_id);
          const d = new Date(apt.reminder_date);
          return (
            <div key={apt.id} className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--success)' }}>
              <div style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700, marginBottom: 4 }}>
                📅 {d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold)', marginBottom: 6 }}>
                ⏰ {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}
              </div>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 2 }}>{aptLead?.full_name || 'Müşteri'}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>📞 {aptLead?.phone}</div>
              <div style={{ fontSize: 12, color: 'var(--accent-gold)', marginBottom: 10 }}>🏠 {apt.message.replace(' Gösterimi', '')}</div>
              {aptLead && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`tel:${aptLead.phone}`} className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px', gap: 4, flex: 1, justifyContent: 'center' }}>
                    <PhoneCall size={12} /> Ara
                  </a>
                  <a href={`https://wa.me/${aptLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 11, padding: '6px 12px', gap: 4, flex: 1, justifyContent: 'center' }}>
                    <MessageSquare size={12} /> WA
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
