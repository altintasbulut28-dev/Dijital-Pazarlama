'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, statusConfig, budgetLabels, type Lead } from '@/lib/supabase';
import { LogOut, Users, Calendar, Phone, CheckCircle, Clock, MessageSquare, PhoneCall, Bell } from 'lucide-react';

const STATUS_PIPELINE: { key: Lead['status']; label: string; color: string; nextLabel?: string; nextStatus?: Lead['status'] }[] = [
  { key: 'yeni',        label: 'Yeni Başvuru',       color: '#8b5cf6', nextLabel: 'İletişime Geç',  nextStatus: 'iletisimde' },
  { key: 'iletisimde',  label: 'İletişimde',         color: '#f97316', nextLabel: 'Randevu Al',     nextStatus: 'randevu'    },
  { key: 'randevu',     label: 'Randevu Onaylandı',  color: '#06b6d4', nextLabel: 'Satışa Taşı',   nextStatus: 'kazanildi'  },
  { key: 'kazanildi',   label: 'Satış Gerçekleşti',  color: '#d4a853'                                                        },
  { key: 'kayip',       label: 'Kayıp',              color: '#6b7280'                                                        },
];

function getMonthlyData(leads: Lead[]) {
  const now = new Date();
  const months: { label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = i === 0 ? 'Bu Ay' : d.toLocaleDateString('tr-TR', { month: 'short' }).replace('.', '');
    const count = leads.filter(l => {
      const c = new Date(l.created_at);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    months.push({ label, value: count });
  }
  return months;
}

export default function AgentPortal() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');
  const [myLeads, setMyLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [newLeadNotif, setNewLeadNotif] = useState<Lead | null>(null);

  useEffect(() => {
    const role = localStorage.getItem('apex_role');
    if (role !== 'agent') { router.push('/'); return; }

    const email = localStorage.getItem('agent_email') || 'Emlakçı';
    const name = localStorage.getItem('agent_name') || email;
    const agentId = localStorage.getItem('agent_id') || '';
    setUserEmail(name);

    let latestDate = new Date().toISOString();
    let interval: ReturnType<typeof setInterval>;

    async function loadLeads() {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .eq('assigned_to', agentId)
        .order('created_at', { ascending: false });

      const leads = (leadsData as Lead[]) || [];
      setMyLeads(leads);
      if (leads.length > 0) latestDate = leads[0].created_at;

      if (leads.length > 0) {
        const { data: reminderData } = await supabase
          .from('reminders')
          .select('*')
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
          .from('leads')
          .select('*')
          .eq('assigned_to', agentId)
          .gt('created_at', latestDate)
          .order('created_at', { ascending: false });

        if (newLeads && newLeads.length > 0) {
          latestDate = newLeads[0].created_at;
          setMyLeads(prev => [...(newLeads as Lead[]), ...prev]);
          setNewLeadNotif(newLeads[0] as Lead);
          setTimeout(() => setNewLeadNotif(null), 6000);
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.setValueAtTime(680, ctx.currentTime + 0.12);
            osc.frequency.setValueAtTime(520, ctx.currentTime + 0.24);
            gain.gain.setValueAtTime(0.4, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
          } catch {}
        }
      }, 5000);
    });

    return () => clearInterval(interval);
  }, [router]);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('apex_role');
      localStorage.removeItem('agent_id');
      localStorage.removeItem('agent_email');
    }
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="skeleton" style={{ width: 50, height: 50, borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Yeni Lead Bildirimi */}
      {newLeadNotif && (
        <div style={{
          position: 'fixed', top: 24, right: 24, zIndex: 9999,
          background: 'linear-gradient(135deg, #0a1128, #111827)',
          border: '1px solid var(--accent-gold)',
          borderRadius: 16, padding: '20px 24px', maxWidth: 340,
          boxShadow: '0 8px 32px rgba(212,168,83,0.25)',
          animation: 'fadeInUp 0.4s ease',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(212,168,83,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={18} color="var(--accent-gold)" />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--accent-gold)', fontWeight: 700 }}>YENİ MÜŞTERİ GELDİ</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{newLeadNotif.full_name}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>📞 {newLeadNotif.phone}</span>
            {newLeadNotif.budget && <span>💰 {newLeadNotif.budget}</span>}
          </div>
        </div>
      )}

      {/* Navbar */}
      <header style={{ background: '#0a1128', padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: 'var(--accent-gold)', borderRadius: 8, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontWeight: 800, fontSize: 18 }}>
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Danışman Portalı</div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{userEmail}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
          <LogOut size={16} /> Çıkış Yap
        </button>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 32, background: 'linear-gradient(135deg, rgba(212,168,83,0.1) 0%, rgba(10,17,40,1) 100%)' }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
            Merhaba, {userEmail.split('@')[0].toUpperCase()}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            {myLeads.length === 0
              ? 'Henüz size atanmış bir müşteri bulunmuyor. Yöneticinizle iletişime geçin.'
              : <>İlgilenilmeyi bekleyen <strong style={{ color: '#fff' }}>{myLeads.filter(l => l.status === 'yeni').length}</strong> yeni başvuru, randevu bekleyen <strong style={{ color: '#fff' }}>{myLeads.filter(l => l.status === 'iletisimde').length}</strong> müşteri var.</>
            }
          </p>
        </div>

        {/* KPI Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { icon: <Users size={20} color="var(--accent-gold)" />, label: 'Toplam Müşteri', value: myLeads.length, accent: 'var(--accent-gold)' },
            { icon: <Calendar size={20} color="var(--success)" />, label: 'Randevulu', value: myLeads.filter(l => l.status === 'randevu').length, accent: 'var(--success)' },
            { icon: <CheckCircle size={20} color="var(--accent-gold)" />, label: 'Kazanılan', value: myLeads.filter(l => l.status === 'kazanildi').length, accent: 'var(--accent-gold)' },
          ].map((kpi, i) => (
            <div key={i} className="glass-card" style={{ padding: 20, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--text-muted)', fontSize: 13 }}>
                {kpi.icon} {kpi.label}
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#fff' }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 28, alignItems: 'start' }}>

          {/* Sol: Chart + Tablo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Bar chart - gerçek data */}
            <div className="glass-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Aylık Lead Akışı</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Son 6 Ay</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140 }}>
                {chartData.map((d, i) => {
                  const isCurrent = i === chartData.length - 1;
                  const h = maxChart === 0 ? 4 : Math.max((d.value / maxChart) * 100, d.value === 0 ? 4 : 0);
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

            {/* Lead tablosu */}
            <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600 }}>Müşteri Listem</h2>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', background: 'rgba(255,255,255,0.08)', padding: '3px 10px', borderRadius: 10 }}>{myLeads.length} kayıt</span>
              </div>

              {myLeads.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                  <p>Henüz size atanmış müşteri yok.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: 12 }}>
                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>MÜŞTERİ</th>
                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>TALEP</th>
                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>DURUM</th>
                        <th style={{ padding: '12px 20px', fontWeight: 600 }}>İŞLEM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myLeads.map(lead => {
                        const pipeline = STATUS_PIPELINE.find(s => s.key === lead.status);
                        const isUpdating = updatingId === lead.id;
                        return (
                          <tr key={lead.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#fff', marginBottom: 2 }}>
                                {lead.full_name}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.phone}</div>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                {lead.property_type ? lead.property_type.charAt(0).toUpperCase() + lead.property_type.slice(1) : '—'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {budgetLabels[lead.budget] || lead.budget}
                              </div>
                              {lead.location_pref && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>📍 {lead.location_pref}</div>
                              )}
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <span style={{ fontSize: 12, padding: '5px 10px', borderRadius: 16, background: `${pipeline?.color}18`, color: pipeline?.color || 'var(--text-muted)' }}>
                                {pipeline?.label || lead.status}
                              </span>
                            </td>
                            <td style={{ padding: '14px 20px' }}>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {/* Telefon */}
                                <a href={`tel:${lead.phone}`} className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, gap: 4 }}>
                                  <Phone size={12} /> Ara
                                </a>
                                {/* WhatsApp */}
                                <a href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ padding: '5px 10px', fontSize: 11, gap: 4 }}>
                                  <MessageSquare size={12} /> WA
                                </a>
                                {/* Pipeline butonu - bir sonraki aşamaya taşı */}
                                {pipeline?.nextStatus && (
                                  <button
                                    disabled={isUpdating}
                                    onClick={() => updateStatus(lead.id, pipeline.nextStatus!)}
                                    className="btn-primary"
                                    style={{ padding: '5px 10px', fontSize: 11, opacity: isUpdating ? 0.5 : 1 }}
                                  >
                                    {isUpdating ? '...' : pipeline.nextLabel}
                                  </button>
                                )}
                                {/* Kayıp işaretle */}
                                {lead.status !== 'kazanildi' && lead.status !== 'kayip' && (
                                  <button
                                    disabled={isUpdating}
                                    onClick={() => updateStatus(lead.id, 'kayip')}
                                    style={{ padding: '5px 10px', fontSize: 11, background: 'none', border: '1px solid rgba(107,114,128,0.4)', borderRadius: 'var(--radius-sm)', color: '#6b7280', cursor: 'pointer', fontFamily: 'inherit' }}
                                  >
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
          </div>

          {/* Sağ: Takvim */}
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={15} color="var(--accent-gold)" /> Yaklaşan Takipler
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {appointments
                .filter(a => new Date(a.reminder_date) >= new Date())
                .slice(0, 6)
                .map(apt => {
                  const aptLead = myLeads.find(l => l.id === apt.lead_id);
                  const d = new Date(apt.reminder_date);
                  return (
                    <div key={apt.id} className="glass-card" style={{ padding: 16, borderLeft: '3px solid var(--accent-gold)' }}>
                      <div style={{ fontSize: 11, color: 'var(--accent-gold)', fontWeight: 700, marginBottom: 6, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{d.toLocaleDateString('tr-TR', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span style={{ background: 'rgba(212,168,83,0.1)', padding: '1px 6px', borderRadius: 4 }}>
                          {d.getHours().toString().padStart(2, '0')}:{d.getMinutes().toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 4 }}>
                        {aptLead?.full_name || 'Müşteri'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                        {apt.message}
                      </div>
                      {aptLead && (
                        <div style={{ marginTop: 10, display: 'flex', gap: 6 }}>
                          <a href={`tel:${aptLead.phone}`} className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}>
                            <PhoneCall size={11} /> Ara
                          </a>
                          <a href={`https://wa.me/${aptLead.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ fontSize: 11, padding: '4px 10px', gap: 4 }}>
                            <MessageSquare size={11} /> WA
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              {appointments.filter(a => new Date(a.reminder_date) >= new Date()).length === 0 && (
                <div className="glass-card" style={{ padding: 28, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Calendar size={28} style={{ opacity: 0.3, margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13 }}>Yaklaşan takip yok.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
