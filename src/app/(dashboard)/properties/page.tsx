'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, type Property } from '@/lib/supabase';
import { Plus, Building, MapPin, Eye, Edit, Copy, CheckCircle } from 'lucide-react';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Tümü');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchProperties();
  }, []);

  async function fetchProperties() {
    setLoading(true);
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (data) setProperties(data as Property[]);
    setLoading(false);
  }

  const filteredProperties = properties.filter((p) => {
    if (filter === 'Tümü') return true;
    return p.durum === filter;
  });

  const copyLink = (prop: Property) => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    // emlakci_telefon alanında agent UUID'si saklanıyor
    const agentParam = prop.emlakci_telefon ? `&agent=${prop.emlakci_telefon}` : '';
    const link = `${origin}/form?mulk=${prop.id}${agentParam}`;
    navigator.clipboard.writeText(link);
    setCopiedId(prop.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Mülk Yönetimi</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            Portföyünüzdeki mülkleri yönetin ve özel form linkleri oluşturun
          </p>
        </div>
        <Link href="/properties/new" className="btn-primary">
          <Plus size={16} />
          Yeni Mülk
        </Link>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {['Tümü', 'Aktif', 'Satıldı', 'Pasif'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              border: `1px solid ${filter === f ? 'var(--accent-gold)' : 'var(--border-subtle)'}`,
              background: filter === f ? 'rgba(212, 168, 83, 0.1)' : 'var(--bg-glass)',
              color: filter === f ? 'var(--accent-gold)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 250, borderRadius: 16 }} />
          ))}
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center' }}>
          <Building size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Henüz Mülk Yok</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Portföyünüze ilk mülkünüzü ekleyerek başlayın.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filteredProperties.map((prop) => (
            <div key={prop.id} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{prop.baslik}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 13 }}>
                    <MapPin size={12} /> {prop.konum || 'Konum belirtilmedi'}
                  </div>
                </div>
                <div
                  style={{
                    padding: '4px 8px',
                    borderRadius: 8,
                    fontSize: 11,
                    fontWeight: 600,
                    background: prop.durum === 'Aktif' ? 'var(--success)' : 'var(--text-muted)',
                    color: '#fff',
                    opacity: prop.durum === 'Aktif' ? 0.9 : 0.6,
                  }}
                >
                  {prop.durum}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12, flex: 1 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Fiyat</div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-gold)' }}>
                    {prop.fiyat ? `${prop.fiyat.toLocaleString('tr-TR')} ₺` : 'Belirtilmedi'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Özellikler</div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>
                    {prop.oda_sayisi || '?'} Oda · {prop.metrekare || '?'}m²
                  </div>
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Emlakçı</div>
                {prop.emlakci_adi ? (
                  <div style={{ fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,168,83,0.1)', color: 'var(--accent-gold)', padding: '3px 10px', borderRadius: 20 }}>
                    {prop.emlakci_adi}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>Atanmamış</div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  className="btn-secondary"
                  onClick={() => copyLink(prop)}
                  style={{ flex: 1, padding: '8px', fontSize: 12 }}
                >
                  {copiedId === prop.id ? <CheckCircle size={14} color="var(--success)" /> : <Copy size={14} />}
                  {copiedId === prop.id ? 'Kopyalandı' : 'Form Linki'}
                </button>
                <Link
                  href={`/properties/${prop.id}`}
                  className="btn-primary"
                  style={{ flex: 1, padding: '8px', fontSize: 12 }}
                >
                  <Eye size={14} /> Detay
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
