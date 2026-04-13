'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  supabase,
  statusConfig,
  budgetLabels,
  purposeLabels,
  timeframeLabels,
  type Lead,
} from '@/lib/supabase';
import {
  Search,
  Filter,
  Phone,
  Mail,
  Eye,
  ChevronDown,
  RefreshCw,
  UserPlus,
  SlidersHorizontal,
} from 'lucide-react';

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [agents, setAgents] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'full_name'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchLeads();
    supabase.from('agents').select('id,name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(a => { map[a.id] = a.name; });
        setAgents(map);
      }
    });
  }, []);

  async function fetchLeads() {
    setLoading(true);
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  }

  // Filter & sort
  const filtered = leads
    .filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.full_name.toLowerCase().includes(q) &&
          !l.phone.includes(q) &&
          !(l.email || '').toLowerCase().includes(q)
        )
          return false;
      }
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'full_name') cmp = a.full_name.localeCompare(b.full_name);
      else cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === 'desc' ? -cmp : cmp;
    });

  async function updateStatus(id: string, newStatus: string) {
    await supabase.from('leads').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus as Lead['status'] } : l)));
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Lead Listesi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            {leads.length} lead · {filtered.length} gösteriliyor
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={fetchLeads}>
            <RefreshCw size={15} />
            Yenile
          </button>
          <Link href="/form" className="btn-primary">
            <UserPlus size={15} />
            Yeni Lead
          </Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              className="input-field"
              placeholder="İsim, telefon veya email ile ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 40 }}
            />
          </div>
          <button
            className="btn-secondary"
            onClick={() => setShowFilters(!showFilters)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <SlidersHorizontal size={15} />
            Filtreler
            <ChevronDown
              size={14}
              style={{
                transform: showFilters ? 'rotate(180deg)' : 'rotate(0)',
                transition: 'transform 0.2s',
              }}
            />
          </button>
        </div>

        {showFilters && (
          <div
            className="animate-fadeIn"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginTop: 12,
              paddingTop: 12,
              borderTop: '1px solid var(--border-subtle)',
            }}
          >
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Durum
              </label>
              <select
                className="select-field"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ fontSize: 13 }}
              >
                <option value="all">Tümü</option>
                {Object.entries(statusConfig).map(([key, s]) => (
                  <option key={key} value={key}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                Sıralama
              </label>
              <select
                className="select-field"
                value={`${sortBy}_${sortDir}`}
                onChange={(e) => {
                  const [field, dir] = e.target.value.split('_') as [typeof sortBy, typeof sortDir];
                  setSortBy(field);
                  setSortDir(dir);
                }}
                style={{ fontSize: 13 }}
              >
                <option value="created_at_desc">En Yeni</option>
                <option value="created_at_asc">En Eski</option>
                <option value="score_desc">Skor (Yüksek)</option>
                <option value="score_asc">Skor (Düşük)</option>
                <option value="full_name_asc">İsim (A-Z)</option>
                <option value="full_name_desc">İsim (Z-A)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton" style={{ height: 56, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Filter size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
              {leads.length === 0 ? 'Henüz lead yok' : 'Filtreye uygun lead bulunamadı'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {leads.length === 0
                ? 'Lead formu üzerinden ilk kaydınızı oluşturun'
                : 'Filtre kriterlerini değiştirin'}
            </p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Bütçe</th>
                <th>Amaç</th>
                <th>Durum</th>
                <th>Emlakçı</th>
                <th>Tarih</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => {
                const status = statusConfig[lead.status] || statusConfig.yeni;
                return (
                  <tr key={lead.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{lead.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                        <span>{lead.phone}</span>
                        {lead.email && <span>· {lead.email}</span>}
                      </div>
                      {lead.property_baslik && (
                        <div style={{ fontSize: 11, color: 'var(--accent-gold)', marginTop: 4 }}>
                          🏡 {lead.property_baslik}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {budgetLabels[lead.budget] || lead.budget}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {purposeLabels[lead.purpose] || lead.purpose}
                    </td>
                    <td>
                      <select
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value)}
                        style={{
                          padding: '6px 10px',
                          background: `${status.color}15`,
                          color: status.color,
                          border: `1px solid ${status.color}30`,
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                      >
                        {Object.entries(statusConfig).map(([key, s]) => (
                          <option key={key} value={key}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {lead.assigned_to && agents[lead.assigned_to] ? (
                        <span style={{ background: 'rgba(212,168,83,0.1)', color: 'var(--accent-gold)', padding: '3px 8px', borderRadius: 6, fontWeight: 600, fontSize: 12 }}>
                          {agents[lead.assigned_to]}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link
                          href={`/leads/${lead.id}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            transition: 'all 0.2s',
                          }}
                          title="Detay"
                        >
                          <Eye size={14} />
                        </Link>
                        <a
                          href={`tel:${lead.phone}`}
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--success)',
                            transition: 'all 0.2s',
                          }}
                          title="Ara"
                        >
                          <Phone size={14} />
                        </a>
                        {lead.email && (
                          <a
                            href={`mailto:${lead.email}`}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              background: 'rgba(59,130,246,0.1)',
                              border: '1px solid rgba(59,130,246,0.2)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--cold)',
                              transition: 'all 0.2s',
                            }}
                            title="Email"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
