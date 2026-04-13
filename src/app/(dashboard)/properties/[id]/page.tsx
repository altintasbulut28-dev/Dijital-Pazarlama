'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Property, type Lead, statusConfig, budgetLabels } from '@/lib/supabase';
import { ArrowLeft, Copy, MapPin, CheckCircle, ExternalLink, Phone, FileText } from 'lucide-react';

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params?.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (propertyId) {
      fetchPropertyAndLeads();
    }
  }, [propertyId]);

  async function fetchPropertyAndLeads() {
    setLoading(true);

    const { data: propData } = await supabase.from('properties').select('*').eq('id', propertyId).single();
    if (propData) setProperty(propData as Property);

    const { data: leadsData } = await supabase.from('leads').select('*').eq('property_id', propertyId).order('score', { ascending: false });
    if (leadsData) setLeads(leadsData as Lead[]);

    setLoading(false);
  }

  const copyFormLink = () => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
    const link = `${origin}/form?mulk=${propertyId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 32, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div className="skeleton" style={{ height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <h2 style={{ fontSize: 20, marginBottom: 12 }}>Mülk bulunamadı</h2>
        <Link href="/properties" className="btn-primary">Mülk Listesine Dön</Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/properties"
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
        Mülk Listesine Dön
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24 }}>
        {/* Sol Kolon: Mülk Bilgileri ve Leadler */}
        <div>
          <div className="glass-card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>{property.baslik}</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
                  <MapPin size={16} />
                  <span style={{ fontSize: 15 }}>{property.konum || 'Konum belirtilmedi'}</span>
                </div>
              </div>
              <div
                style={{
                  padding: '6px 12px',
                  borderRadius: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  background: property.durum === 'Aktif' ? 'var(--success)' : 'var(--text-muted)',
                  color: '#fff',
                }}
              >
                {property.durum}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, padding: '24px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>FİYAT</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-gold)' }}>
                  {property.fiyat ? `${property.fiyat.toLocaleString('tr-TR')} ₺` : '-'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>TİP</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{property.tip}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ODA SAYISI</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{property.oda_sayisi || '-'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>METREKARE</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{property.metrekare ? `${property.metrekare} m²` : '-'}</div>
              </div>
            </div>

            {property.aciklama && (
              <div style={{ marginTop: 24 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: 'var(--text-secondary)' }}>Açıklama</h3>
                <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, fontSize: 15 }}>
                  {property.aciklama}
                </p>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>
              Bu Mülkle İlgilenen Leadler ({leads.length})
            </h2>

            {leads.length === 0 ? (
              <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Henüz bu mülk için bir başvuru yok.</p>
              </div>
            ) : (
              <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>İsim</th>
                      <th>Durum</th>
                      <th>Bütçe</th>
                      <th>Tarih</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => {
                      const status = statusConfig[lead.status] || statusConfig.yeni;
                      return (
                        <tr key={lead.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{lead.full_name}</div>
                          </td>
                          <td>
                            <span style={{ fontSize: 13, color: status.color, fontWeight: 600 }}>
                              {status.label}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{budgetLabels[lead.budget] || lead.budget}</td>
                          <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                            {new Date(lead.created_at).toLocaleDateString('tr-TR')}
                          </td>
                          <td>
                            <Link href={`/leads/${lead.id}`} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
                              Detay
                            </Link>
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

        {/* Sağ Kolon: Hızlı İşlemler */}
        <div>
          <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Paylaşım Linki</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Bu mülke özel form linkini Instagram, WhatsApp veya reklamlarda paylaşın. Müşterileriniz doğrudan bu mülk ile ilişkilendirilir.
            </p>
            <button
              onClick={copyFormLink}
              style={{
                width: '100%',
                padding: '14px',
                background: copiedLink ? 'rgba(34, 197, 94, 0.1)' : 'linear-gradient(135deg, rgba(212, 168, 83, 0.1), rgba(212, 168, 83, 0.05))',
                border: `1px dashed ${copiedLink ? 'var(--success)' : 'var(--accent-gold)'}`,
                borderRadius: 'var(--radius-md)',
                color: copiedLink ? 'var(--success)' : 'var(--accent-gold)',
                fontWeight: 600,
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {copiedLink ? <CheckCircle size={18} /> : <Copy size={18} />}
              {copiedLink ? 'Link Kopyalandı!' : '/form?mulk=' + propertyId.substring(0, 8) + '...'}
            </button>
          </div>

          <div className="glass-card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Hızlı İşlemler</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {property.sunum_url && (
                <a
                  href={property.sunum_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <FileText size={16} color="var(--cyan)" />
                  Mülk Sunumunu Aç
                </a>
              )}
              {property.fotograf_url && (
                <a
                  href={property.fotograf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <ExternalLink size={16} color="var(--purple)" />
                  Fotoğraflara Git
                </a>
              )}
              {property.emlakci_telefon && (
                <a
                  href={`tel:${property.emlakci_telefon}`}
                  className="btn-secondary"
                  style={{ justifyContent: 'flex-start' }}
                >
                  <Phone size={16} color="var(--success)" />
                  Emlakçıyı Ara ({property.emlakci_adi || 'Belirtilmedi'})
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
