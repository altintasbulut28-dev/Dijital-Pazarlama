'use client';

import { useEffect, useState } from 'react';
import { supabase, type Lead, type Property, type Agent } from '@/lib/supabase';
import { Megaphone, MessageSquare, Send, Users, ChevronRight, Sparkles, ChevronDown } from 'lucide-react';

export default function CampaignsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  // Adım 1: Emlakçı seçimi
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Adım 2: Aksiyon seçimi
  const [activeTab, setActiveTab] = useState<'followup' | 'broadcast' | null>(null);

  // Broadcast
  const [broadcastPropertyId, setBroadcastPropertyId] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastSuccess, setBroadcastSuccess] = useState(false);

  // Followup: seçili müşteriler
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Emlakçı değişince tab ve seçimleri sıfırla
  useEffect(() => {
    setActiveTab(null);
    setBroadcastPropertyId('');
    setSelectedLeads([]);
    setBroadcastSuccess(false);
  }, [selectedAgentId]);

  async function fetchData() {
    setLoading(true);
    const [{ data: leadsData }, { data: propertiesData }, { data: agentsData }] = await Promise.all([
      supabase.from('leads').select('*').order('created_at', { ascending: false }),
      supabase.from('properties').select('*').order('created_at', { ascending: false }),
      supabase.from('agents').select('*').order('name', { ascending: true }),
    ]);
    if (leadsData) setLeads(leadsData as Lead[]);
    if (propertiesData) setProperties(propertiesData as Property[]);
    if (agentsData) setAgents(agentsData as Agent[]);
    setLoading(false);
  }

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const agentLeads = leads.filter(l => l.assigned_to === selectedAgentId);

  const getAlternativePropertyUrl = (lead: Lead) => {
    const altProp = properties.find(p => p.id !== lead.property_id);
    if (!altProp) return '#';
    const message = `Merhaba ${lead.full_name}, geçtiğimiz günlerde ilanımızla ilgilenmiştiniz. Eğer o mülk size uymadıysa, bütçenize çok uygun olan şu yeni fırsatımıza göz atmak ister misiniz?\n\n📍 ${altProp.baslik}\n🔗 ${window.location.origin}/presentation/${altProp.id}`;
    return `https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
  };

  const handleSendBroadcast = async () => {
    if (!broadcastPropertyId) { alert('Lütfen bir fırsat mülkü seçin!'); return; }
    setSendingBroadcast(true);

    const targetLeads = selectedLeads.length > 0
      ? agentLeads.filter(l => selectedLeads.includes(l.id))
      : agentLeads;

    const validEmails = targetLeads.map(l => l.email).filter(Boolean) as string[];
    if (validEmails.length === 0) validEmails.push('musteri_yok_test@apex.os');

    const prop = properties.find(p => p.id === broadcastPropertyId);
    const subject = `Özel Fırsat: ${prop?.baslik}`;
    const urlLink = `${window.location.origin}/presentation/${prop?.id}`;
    const textBody = `Merhaba,\n\nKriterlerinizi detaylıca inceledik ve size harika bir fırsat sunmak istiyoruz:\n\n📍 ${prop?.baslik}\nFiyat: ${prop?.fiyat?.toLocaleString('tr-TR')} ₺\n\nPazar fiyatının altındaki bu mülk için hemen dijital sunumu inceleyin:\n🔗 ${urlLink}\n\nİyi günler dileriz.`;

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: validEmails, subject, text: textBody }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Bilinmeyen hata');
      setBroadcastSuccess(true);
    } catch (e: unknown) {
      alert(`Gönderim başarısız: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setSendingBroadcast(false);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Veriler Yükleniyor...</div>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', paddingBottom: 60 }}>

      {/* Başlık */}
      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Megaphone size={24} color="#0a0e1a" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Kampanya Merkezi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Emlakçı seçin, müşterilerine dürtme veya toplu mesaj gönderin.</p>
        </div>
      </div>

      {/* ADIM 1: Emlakçı Seç */}
      <div className="glass-card" style={{ padding: 28, marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: 1, marginBottom: 12 }}>ADIM 1 — EMLAKÇI SEÇ</div>
        <div style={{ position: 'relative' }}>
          <select
            className="select-field"
            value={selectedAgentId}
            onChange={e => setSelectedAgentId(e.target.value)}
            style={{ paddingRight: 40 }}
          >
            <option value="">-- Bir Emlakçı Seçin --</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} — {leads.filter(l => l.assigned_to === agent.id).length} müşteri
              </option>
            ))}
          </select>
          <ChevronDown size={16} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        </div>

        {selectedAgent && (
          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#0a0e1a' }}>
              {selectedAgent.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{selectedAgent.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{agentLeads.length} müşteri atanmış</div>
            </div>
          </div>
        )}
      </div>

      {/* ADIM 2: Aksiyon Seç — sadece emlakçı seçildiyse */}
      {selectedAgentId && (
        <div className="animate-fadeInUp">
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: 1, marginBottom: 12 }}>ADIM 2 — AKSİYON SEÇ</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>

            {/* Müşteri Dürtme Butonu */}
            <button
              onClick={() => setActiveTab(activeTab === 'followup' ? null : 'followup')}
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: activeTab === 'followup' ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: activeTab === 'followup' ? 'rgba(212,168,83,0.1)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageSquare size={18} color="var(--success)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'followup' ? 'var(--accent-gold)' : '#fff' }}>Müşteri Dürtme</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedAgent?.name} müşterilerine WhatsApp ile takip ve yeni mülk önerisi gönder.
              </div>
            </button>

            {/* Toplu Reklam Butonu */}
            <button
              onClick={() => setActiveTab(activeTab === 'broadcast' ? null : 'broadcast')}
              style={{
                padding: '20px 24px',
                borderRadius: 12,
                border: activeTab === 'broadcast' ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                background: activeTab === 'broadcast' ? 'rgba(212,168,83,0.1)' : 'var(--bg-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(212,168,83,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} color="var(--accent-gold)" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, color: activeTab === 'broadcast' ? 'var(--accent-gold)' : '#fff' }}>Toplu Reklam</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {selectedAgent?.name} müşterilerine e-posta ile fırsat mülkü duyurusu yap.
              </div>
            </button>
          </div>

          {/* ADIM 3: İçerik */}

          {/* — Müşteri Dürtme — */}
          {activeTab === 'followup' && (
            <div className="animate-fadeInUp">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: 1, marginBottom: 16 }}>
                ADIM 3 — {selectedAgent?.name.toUpperCase()} MÜŞTERİLERİ ({agentLeads.length})
              </div>
              {agentLeads.length === 0 ? (
                <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Bu emlakçıya atanmış müşteri bulunmuyor.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {agentLeads.map(lead => (
                    <div key={lead.id} className="glass-card" style={{ padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{lead.full_name}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                          {lead.property_baslik || 'Genel Başvuru'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--accent-gold)', marginTop: 4 }}>
                          Bütçe: {lead.budget} &nbsp;·&nbsp; Durum: {lead.status}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                        <a
                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Merhaba ${lead.full_name}, geçen günkü mülk sunumunu incelediniz mi? Neler düşünüyorsunuz?`)}`}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-secondary" style={{ padding: '9px 14px', fontSize: 13 }}
                        >
                          <MessageSquare size={14} color="var(--success)" />
                          Durumu Sor
                        </a>
                        <a
                          href={getAlternativePropertyUrl(lead)}
                          target="_blank" rel="noopener noreferrer"
                          className="btn-primary" style={{ padding: '9px 14px', fontSize: 13 }}
                        >
                          <Sparkles size={14} />
                          Yeni Mülk Öner <ChevronRight size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* — Toplu Reklam — */}
          {activeTab === 'broadcast' && (
            <div className="animate-fadeInUp">
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent-gold)', letterSpacing: 1, marginBottom: 16 }}>
                ADIM 3 — REKLAM AYARLARI
              </div>
              {broadcastSuccess ? (
                <div className="glass-card" style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </div>
                  <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Başarıyla Gönderildi!</h2>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
                    {selectedAgent?.name} müşterilerine kampanya e-postası iletildi.
                  </p>
                  <button onClick={() => { setBroadcastSuccess(false); setBroadcastPropertyId(''); setSelectedLeads([]); }} className="btn-primary" style={{ padding: '14px 28px' }}>
                    Yeni Kampanya Yap
                  </button>
                </div>
              ) : (
                <div className="glass-card" style={{ padding: 28 }}>

                  {/* Müşteri seçimi */}
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
                        Müşteriler <span style={{ color: 'var(--accent-gold)' }}>({agentLeads.length} kişi)</span>
                      </label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setSelectedLeads(agentLeads.map(l => l.id))} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--accent-gold)', cursor: 'pointer' }}>Tümünü Seç</button>
                        <span style={{ color: 'var(--border-subtle)' }}>|</span>
                        <button onClick={() => setSelectedLeads([])} style={{ fontSize: 12, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Temizle</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
                      {agentLeads.length === 0 ? (
                        <div style={{ gridColumn: '1/-1', padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                          Bu emlakçıya atanmış müşteri yok.
                        </div>
                      ) : agentLeads.map(lead => (
                        <div
                          key={lead.id}
                          onClick={() => setSelectedLeads(prev => prev.includes(lead.id) ? prev.filter(id => id !== lead.id) : [...prev, lead.id])}
                          style={{
                            padding: 12,
                            borderRadius: 8,
                            border: selectedLeads.includes(lead.id) ? '2px solid var(--accent-gold)' : '1px solid var(--border-subtle)',
                            background: selectedLeads.includes(lead.id) ? 'rgba(212,168,83,0.08)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{lead.full_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lead.phone}</div>
                          {lead.email && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{lead.email}</div>}
                        </div>
                      ))}
                    </div>
                    {selectedLeads.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: 'var(--accent-gold)' }}>
                        <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                        {selectedLeads.length} müşteri seçildi
                      </div>
                    )}
                  </div>

                  {/* Mülk seçimi */}
                  <div style={{ marginBottom: 24 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                      Pazarlanacak Fırsat Mülkü
                    </label>
                    <select className="select-field" value={broadcastPropertyId} onChange={e => setBroadcastPropertyId(e.target.value)}>
                      <option value="">-- Bir Mülk Seçin --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.baslik} — {p.fiyat?.toLocaleString('tr-TR')} ₺</option>
                      ))}
                    </select>
                  </div>

                  {/* Önizleme */}
                  {broadcastPropertyId && (
                    <div style={{ background: 'var(--bg-primary)', padding: 16, borderRadius: 10, border: '1px solid var(--border-subtle)', marginBottom: 24, fontSize: 14, color: '#fff', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>ÖNİZLEME</div>
                      {`Merhaba,\n\nKriterlerinizi detaylıca inceledik ve size harika bir fırsat sunmak istiyoruz:\n\n📍 ${properties.find(p => p.id === broadcastPropertyId)?.baslik}\nFiyat: ${properties.find(p => p.id === broadcastPropertyId)?.fiyat?.toLocaleString('tr-TR')} ₺\n\nPazar fiyatının altındaki bu mülk için hemen dijital sunumu inceleyin 🔗\n\nİyi günler dileriz.`}
                    </div>
                  )}

                  <button
                    onClick={handleSendBroadcast}
                    className="btn-primary"
                    style={{ width: '100%', padding: 16, justifyContent: 'center', fontSize: 15 }}
                    disabled={sendingBroadcast || !broadcastPropertyId || agentLeads.length === 0}
                  >
                    {sendingBroadcast
                      ? 'Gönderiliyor...'
                      : `🚀 ${selectedLeads.length > 0 ? selectedLeads.length : agentLeads.length} Müşteriye E-Posta Gönder`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Emlakçı seçilmedi uyarısı */}
      {!selectedAgentId && (
        <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(212,168,83,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Users size={28} color="var(--accent-gold)" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Başlamak için bir emlakçı seçin</div>
          <div style={{ fontSize: 14 }}>Kampanya gönderilecek emlakçıyı seçtikten sonra aksiyonlar görünecek.</div>
        </div>
      )}
    </div>
  );
}
