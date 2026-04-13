'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  supabase,
  statusConfig,
  budgetLabels,
  purposeLabels,
  timeframeLabels,
  type Lead,
  type Note,
} from '@/lib/supabase';
import {
  ArrowLeft,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  PhoneCall,
  Calendar,
  Send,
  Trash2,
  Tag,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

const noteTypeConfig: Record<string, { label: string; icon: typeof MessageSquare; color: string }> = {
  note: { label: 'Not', icon: MessageSquare, color: 'var(--accent-gold)' },
  call: { label: 'Arama', icon: PhoneCall, color: 'var(--success)' },
  meeting: { label: 'Toplantı', icon: Calendar, color: 'var(--cyan)' },
  email: { label: 'Email', icon: Mail, color: 'var(--cold)' },
  status_change: { label: 'Durum Değişikliği', icon: Tag, color: 'var(--purple)' },
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = params?.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [agents, setAgents] = useState<{ id: string; name: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState('note');
  const [submittingNote, setSubmittingNote] = useState(false);

  useEffect(() => {
    if (leadId) {
      fetchLead();
      fetchNotes();
    }
    supabase.from('agents').select('id,name,email').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setAgents(data);
    });
  }, [leadId]);

  async function fetchLead() {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').eq('id', leadId).single();
    if (data) setLead(data as Lead);
    setLoading(false);
  }

  async function fetchNotes() {
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });
    if (data) setNotes(data as Note[]);
  }

  async function addNote() {
    if (!newNote.trim()) return;
    setSubmittingNote(true);
    const { error } = await supabase.from('notes').insert([
      {
        lead_id: leadId,
        content: newNote.trim(),
        note_type: noteType,
      },
    ]);
    if (!error) {
      setNewNote('');
      fetchNotes();
    }
    setSubmittingNote(false);
  }

  async function deleteNote(noteId: string) {
    await supabase.from('notes').delete().eq('id', noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }

  async function updateLeadStatus(newStatus: string) {
    if (!lead) return;
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', leadId);
    setLead({ ...lead, status: newStatus as Lead['status'] });

    // Auto-add status change note
    await supabase.from('notes').insert([
      {
        lead_id: leadId,
        content: `Durum "${statusConfig[lead.status]?.label}" → "${statusConfig[newStatus]?.label}" olarak güncellendi`,
        note_type: 'status_change',
      },
    ]);
    fetchNotes();
  }

  async function updateEstimatedValue(value: string) {
    if (!lead) return;
    const num = parseFloat(value) || 0;
    await supabase.from('leads').update({ estimated_value: num }).eq('id', leadId);
    setLead({ ...lead, estimated_value: num });
  }

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Lead bulunamadı</h2>
        <Link href="/leads" className="btn-primary">Lead Listesine Dön</Link>
      </div>
    );
  }

  const status = statusConfig[lead.status] || statusConfig.yeni;

  return (
    <div>
      {/* Back button */}
      <Link
        href="/leads"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          fontSize: 14,
          marginBottom: 24,
          transition: 'color 0.2s',
        }}
      >
        <ArrowLeft size={16} />
        Lead Listesine Dön
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        {/* Main content */}
        <div>
          {/* Lead info card */}
          <div className="glass-card" style={{ padding: 28, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>{lead.full_name}</h1>
                <div style={{ display: 'flex', gap: 16, color: 'var(--text-secondary)', fontSize: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Phone size={14} /> {lead.phone}
                  </span>
                  {lead.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Mail size={14} /> {lead.email}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {lead.property_baslik && (
                  <Link href={`/properties/${lead.property_id}`} className="badge" style={{ background: 'rgba(212,168,83,0.1)', color: 'var(--accent-gold)', fontSize: 13, textDecoration: 'none' }}>
                    🏡 {lead.property_baslik}
                  </Link>
                )}
              </div>
            </div>

            {/* Details grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
                padding: '20px 0',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>BÜTÇE</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{budgetLabels[lead.budget] || lead.budget}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>AMAÇ</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{purposeLabels[lead.purpose] || lead.purpose}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>ZAMAN</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{timeframeLabels[lead.timeframe] || lead.timeframe}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>KAYNAK</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{lead.source || 'Belirtilmedi'}</div>
              </div>
            </div>

            {/* Status & Value */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 16,
                paddingTop: 16,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Durum
                </label>
                <select
                  className="select-field"
                  value={lead.status}
                  onChange={(e) => updateLeadStatus(e.target.value)}
                >
                  {Object.entries(statusConfig).map(([key, s]) => (
                    <option key={key} value={key}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Tahmini Mülk Değeri (₺)
                </label>
                <input
                  className="input-field"
                  type="number"
                  placeholder="Örn: 3000000"
                  value={lead.estimated_value || ''}
                  onChange={(e) => updateEstimatedValue(e.target.value)}
                />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                  Atanan Emlakçı
                </label>
                <select
                  className="select-field"
                  value={lead.assigned_to || ''}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setLead({ ...lead, assigned_to: val || null });
                    await supabase.from('leads').update({ assigned_to: val || null }).eq('id', leadId);
                  }}
                >
                  <option value="">— Atanmamış —</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Notes section */}
          <div className="glass-card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
              Notlar & Aktiviteler
            </h2>

            {/* Add note */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                {Object.entries(noteTypeConfig).filter(([k]) => k !== 'status_change').map(([key, t]) => (
                  <button
                    key={key}
                    onClick={() => setNoteType(key)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      border: `1px solid ${noteType === key ? t.color : 'var(--border-subtle)'}`,
                      background: noteType === key ? `${t.color}15` : 'transparent',
                      color: noteType === key ? t.color : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.2s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <textarea
                  className="textarea-field"
                  placeholder="Not ekleyin..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  style={{ minHeight: 80 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                <button
                  className="btn-primary"
                  onClick={addNote}
                  disabled={!newNote.trim() || submittingNote}
                  style={{ opacity: newNote.trim() && !submittingNote ? 1 : 0.5, padding: '10px 20px' }}
                >
                  <Send size={14} />
                  {submittingNote ? 'Kaydediliyor...' : 'Not Ekle'}
                </button>
              </div>
            </div>

            {/* Notes list */}
            {notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                Henüz not eklenmemiş
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {notes.map((note) => {
                  const nt = noteTypeConfig[note.note_type] || noteTypeConfig.note;
                  const NtIcon = nt.icon;
                  return (
                    <div
                      key={note.id}
                      style={{
                        padding: 16,
                        background: 'var(--bg-glass)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-subtle)',
                        borderLeft: `3px solid ${nt.color}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <NtIcon size={14} color={nt.color} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: nt.color }}>{nt.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            · {new Date(note.created_at).toLocaleString('tr-TR')}
                          </span>
                        </div>
                        {note.note_type !== 'status_change' && (
                          <button
                            onClick={() => deleteNote(note.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 4,
                              transition: 'color 0.2s',
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {note.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          {/* Quick actions */}
          <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Hızlı İşlemler</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a href={`tel:${lead.phone}`} className="btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                <Phone size={15} color="var(--success)" />
                Ara: {lead.phone}
              </a>
              {lead.email && (
                <a href={`mailto:${lead.email}`} className="btn-secondary" style={{ justifyContent: 'flex-start', width: '100%' }}>
                  <Mail size={15} color="var(--cold)" />
                  Email Gönder
                </a>
              )}
              <a
                href={`https://wa.me/${lead.phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
                style={{ justifyContent: 'flex-start', width: '100%' }}
              >
                <MessageSquare size={15} color="var(--success)" />
                WhatsApp
              </a>
              {lead.property_id && (
                <a
                  href={`https://wa.me/${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Merhaba ${lead.full_name}, size özel mülk sunumunu hazırladık: ${typeof window !== 'undefined' ? window.location.origin : ''}/presentation/${lead.property_id}?lead=${lead.id}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <Send size={15} />
                  Sunum Gönder (WA)
                </a>
              )}
              {lead.property_id && (
                <Link
                  href={`/presentation/${lead.property_id}?lead=${lead.id}`}
                  target="_blank"
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start', width: '100%' }}
                >
                  <ExternalLink size={15} color="var(--accent-gold)" />
                  Sunumu Önizle
                </Link>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Zaman Çizelgesi</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-gold)' }} />
                  <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', marginTop: 4 }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Lead Oluşturuldu</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(lead.created_at).toLocaleString('tr-TR')}
                  </div>
                </div>
              </div>
              {notes.slice().reverse().map((note, i) => {
                const nt = noteTypeConfig[note.note_type] || noteTypeConfig.note;
                return (
                  <div key={note.id} style={{ display: 'flex', gap: 12, paddingBottom: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: nt.color }} />
                      {i < notes.length - 1 && (
                        <div style={{ width: 1, flex: 1, background: 'var(--border-subtle)', marginTop: 4 }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: nt.color }}>{nt.label}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        {new Date(note.created_at).toLocaleString('tr-TR')}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                        {note.content.slice(0, 80)}{note.content.length > 80 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
