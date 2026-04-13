'use client';

import { useEffect, useState } from 'react';
import { supabase, type Agent } from '@/lib/supabase';
import { Copy, Check, Plus, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react';

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pass = 'AP-';
  for (let i = 0; i < 6; i++) pass += chars[Math.floor(Math.random() * chars.length)];
  return pass;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newAgent, setNewAgent] = useState({ name: '', email: '', phone: '' });
  const [adding, setAdding] = useState(false);
  const [tableError, setTableError] = useState(false);
  const [noPasswordCol, setNoPasswordCol] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
  const [copiedPassword, setCopiedPassword] = useState<string | null>(null);

  useEffect(() => { fetchAgents(); }, []);

  const fetchAgents = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('agents').select('*').order('created_at', { ascending: false });
    if (error && (error.message.includes('agents') || error.code === 'PGRST205' || error.code === '42P01')) {
      setTableError(true);
    } else {
      setAgents(data || []);
      // password kolonu yoksa uyar
      if (data && data.length > 0 && !('password' in data[0])) {
        setNoPasswordCol(true);
      }
    }
    setLoading(false);
  };

  const copyFormLink = (agentId: string) => {
    const link = `${window.location.origin}/form?agent=${agentId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(agentId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyPassword = (agentId: string, password: string) => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(agentId);
    setTimeout(() => setCopiedPassword(null), 2000);
  };

  const togglePasswordVisibility = (agentId: string) => {
    setVisiblePasswords(prev => {
      const next = new Set(prev);
      next.has(agentId) ? next.delete(agentId) : next.add(agentId);
      return next;
    });
  };

  const regeneratePassword = async (agent: Agent) => {
    if (!confirm(`${agent.name} için yeni şifre oluşturulsun mu? Eski şifre çalışmaz olacak.`)) return;
    const newPass = generatePassword();
    setRegeneratingId(agent.id);
    await supabase.from('agents').update({ password: newPass }).eq('id', agent.id);
    setAgents(prev => prev.map(a => a.id === agent.id ? { ...a, password: newPass } : a));
    setVisiblePasswords(prev => { const n = new Set(prev); n.add(agent.id); return n; });
    setRegeneratingId(null);
  };

  const addAgent = async () => {
    if (!newAgent.name.trim() || !newAgent.email.trim()) {
      alert('İsim ve email gerekli');
      return;
    }
    setAdding(true);
    const password = generatePassword();
    const { data, error } = await supabase.from('agents').insert([{
      name: newAgent.name.trim(),
      email: newAgent.email.trim(),
      phone: newAgent.phone.trim() || null,
      is_active: true,
      password,
    }]).select().single();

    if (!error && data) {
      setNewAgent({ name: '', email: '', phone: '' });
      setNewlyAddedId(data.id);
      setVisiblePasswords(prev => { const n = new Set(prev); n.add(data.id); return n; });
      fetchAgents();
      setTimeout(() => setNewlyAddedId(null), 8000);
    } else {
      alert('Hata: ' + error?.message);
    }
    setAdding(false);
  };

  const deleteAgent = async (id: string) => {
    if (!confirm('Bu emlakçıyı silmek istediğinize emin misiniz?')) return;
    await supabase.from('agents').delete().eq('id', id);
    fetchAgents();
  };

  const AGENTS_SQL = `-- Tabloyu ilk kez oluşturuyorsanız:
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  password TEXT
);
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_all" ON agents FOR ALL USING (true) WITH CHECK (true);

-- Tablo zaten varsa sadece password kolonu ekleyin:
ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT;`;

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>Yükleniyor...</div>;

  if (tableError) {
    return (
      <div style={{ maxWidth: 700, margin: '0 auto', paddingTop: 40 }}>
        <div className="glass-card" style={{ padding: 32, border: '1px solid rgba(239,68,68,0.3)' }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, color: '#ef4444' }}>⚠️ Agents Tablosu Bulunamadı</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Supabase&apos;de <code style={{ background: 'rgba(212,168,83,0.1)', padding: '2px 6px', borderRadius: 4 }}>agents</code> tablosu yok.
            Aşağıdaki SQL&apos;i kopyalayıp Supabase SQL Editor&apos;da çalıştırın.
          </p>
          <pre style={{ background: '#0d1117', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: 16, fontSize: 13, color: '#c9d1d9', whiteSpace: 'pre-wrap', marginBottom: 20 }}>
            {AGENTS_SQL}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn-primary" onClick={() => { navigator.clipboard.writeText(AGENTS_SQL); alert('SQL kopyalandı!'); }} style={{ flex: 1, justifyContent: 'center' }}>
              <Copy size={16} /> SQL&apos;i Kopyala
            </button>
            <a href="https://supabase.com/dashboard/project/kenzsbokntqlrzxneund/sql/new" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
              Supabase&apos;i Aç →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 32 }}>Emlakçılar Yönetimi</h1>

      {/* Password kolonu yoksa migration uyarısı */}
      {noPasswordCol && (
        <div className="glass-card" style={{ padding: 20, marginBottom: 24, border: '1px solid rgba(234,179,8,0.3)', background: 'rgba(234,179,8,0.05)' }}>
          <p style={{ color: '#eab308', fontWeight: 600, marginBottom: 8 }}>⚠️ Şifre kolonu eksik — Supabase&apos;e ekleyin</p>
          <code style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT;</code>
          <button onClick={() => { navigator.clipboard.writeText('ALTER TABLE agents ADD COLUMN IF NOT EXISTS password TEXT;'); alert('Kopyalandı!'); }} style={{ marginLeft: 12, background: 'none', border: '1px solid rgba(234,179,8,0.4)', color: '#eab308', padding: '3px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
            Kopyala
          </button>
        </div>
      )}

      {/* Yeni Emlakçı Ekle */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 32 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Yeni Emlakçı Ekle</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
          Ekle butonuna bastığınızda otomatik şifre oluşturulur. Şifreyi emlakçıya gönderin.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <input type="text" className="input-field" placeholder="İsim*" value={newAgent.name} onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })} />
          <input type="email" className="input-field" placeholder="Email*" value={newAgent.email} onChange={(e) => setNewAgent({ ...newAgent, email: e.target.value })} />
          <input type="tel" className="input-field" placeholder="Telefon" value={newAgent.phone} onChange={(e) => setNewAgent({ ...newAgent, phone: e.target.value })} />
        </div>
        <button className="btn-primary" onClick={addAgent} disabled={adding} style={{ marginTop: 16, width: '100%', justifyContent: 'center' }}>
          <Plus size={16} />
          {adding ? 'Ekleniyor...' : 'Emlakçı Ekle & Şifre Oluştur'}
        </button>
      </div>

      {/* Emlakçılar Tablosu */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>İsim</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Giriş Şifresi</th>
              <th>Form Linki</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Henüz emlakçı eklenmemiş
                </td>
              </tr>
            ) : (
              agents.map((agent) => {
                const isVisible = visiblePasswords.has(agent.id);
                const isNewlyAdded = newlyAddedId === agent.id;
                const isRegenerating = regeneratingId === agent.id;
                return (
                  <tr key={agent.id} style={isNewlyAdded ? { background: 'rgba(212,168,83,0.08)' } : {}}>
                    <td style={{ fontWeight: 600 }}>{agent.name}</td>
                    <td>{agent.email}</td>
                    <td>{agent.phone || '—'}</td>
                    <td>
                      {agent.password ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <code style={{ fontSize: 13, fontWeight: 700, background: isNewlyAdded ? 'rgba(212,168,83,0.2)' : 'rgba(255,255,255,0.06)', padding: '4px 10px', borderRadius: 6, letterSpacing: 1, color: isNewlyAdded ? 'var(--accent-gold)' : '#fff', minWidth: 110, display: 'inline-block' }}>
                            {isVisible ? agent.password : '••••••••••'}
                          </code>
                          <button title={isVisible ? 'Gizle' : 'Göster'} onClick={() => togglePasswordVisibility(agent.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                            {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                          <button title="Şifreyi kopyala" onClick={() => copyPassword(agent.id, agent.password!)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedPassword === agent.id ? 'var(--success)' : 'var(--text-muted)', padding: 4 }}>
                            {copiedPassword === agent.id ? <Check size={15} /> : <Copy size={15} />}
                          </button>
                          <button title="Yeni şifre oluştur" onClick={() => regeneratePassword(agent)} disabled={isRegenerating} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, opacity: isRegenerating ? 0.4 : 1 }}>
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => regeneratePassword(agent)} className="btn-secondary" style={{ fontSize: 12, padding: '5px 10px' }}>
                          <Plus size={13} /> Şifre Oluştur
                        </button>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <code style={{ fontSize: 12, background: 'rgba(212,168,83,0.1)', padding: '4px 8px', borderRadius: 4 }}>
                          /form?agent={agent.id}
                        </code>
                        <button onClick={() => copyFormLink(agent.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === agent.id ? 'var(--success)' : 'var(--text-muted)' }}>
                          {copiedId === agent.id ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <button onClick={() => deleteAgent(agent.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', padding: '6px 12px', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Trash2 size={14} /> Sil
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
