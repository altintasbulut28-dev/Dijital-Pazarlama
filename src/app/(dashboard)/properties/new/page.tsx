'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, type Agent } from '@/lib/supabase';
import { ArrowLeft, Save, Building } from 'lucide-react';

export default function NewPropertyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [formData, setFormData] = useState({
    baslik: '',
    aciklama: '',
    fiyat: '',
    konum: '',
    oda_sayisi: '',
    metrekare: '',
    tip: 'Daire',
    durum: 'Aktif',
    fotograf_url: '',
    sunum_url: '',
    agent_id: '',
    komisyon_orani: '2',
  });

  useEffect(() => {
    supabase.from('agents').select('*').eq('is_active', true).order('name').then(({ data }) => {
      if (data) setAgents(data as Agent[]);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const selectedAgent = agents.find(a => a.id === formData.agent_id);
    const dataToInsert: Record<string, unknown> = {
      baslik: formData.baslik,
      aciklama: formData.aciklama,
      fiyat: formData.fiyat ? parseFloat(formData.fiyat) : null,
      konum: formData.konum,
      oda_sayisi: formData.oda_sayisi ? parseInt(formData.oda_sayisi) : null,
      metrekare: formData.metrekare ? parseInt(formData.metrekare) : null,
      tip: formData.tip,
      durum: formData.durum,
      fotograf_url: formData.fotograf_url,
      sunum_url: formData.sunum_url,
      emlakci_adi: selectedAgent?.name || null,
      emlakci_telefon: selectedAgent?.id || null,
      komisyon_orani: formData.komisyon_orani ? parseFloat(formData.komisyon_orani) : 2,
    };

    const { error } = await supabase.from('properties').insert([dataToInsert]);

    if (!error) {
      setSuccess(true);
    } else {
      if (error.message.includes('relation "public.properties" does not exist') || error.message.includes('relation "properties" does not exist')) {
        alert('Veritabanında eksiklik var! Lütfen sol menüden "Sistem Kurulumu" sayfasına girin ve SQL tablosunu Supabase üzerinden oluşturun.');
      } else {
        alert('Mülk eklenirken hata oluştu: ' + error.message);
      }
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div style={{ maxWidth: 600, margin: '100px auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: 60 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 10 0 1-5.93 9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 16 }}>Mülk Kaydedildi!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 32 }}>
            Yeni mülk başarıyla sisteminize eklendi ve portföy yayınında. Artık bu mülke özel link oluşturup müşterilere gönderebilirsiniz.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={() => { setSuccess(false); setFormData({...formData, baslik: '', fiyat: '', aciklama: ''}); }} className="btn-secondary">
              Yeni Bir Mülk Daha Ekle
            </button>
            <Link href="/properties" className="btn-primary">
              Mülk Listesine Dön
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
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
        Mülklere Dön
      </Link>

      <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Building size={24} color="#0a0e1a" />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Yeni Mülk Ekle</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Portföyünüze yeni bir mülk ekleyin</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card" style={{ padding: 32 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Sol Kolon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Mülk Başlığı <span style={{ color: 'var(--hot)' }}>*</span>
              </label>
              <input
                type="text"
                name="baslik"
                required
                className="input-field"
                placeholder="Örn: Beşiktaş Lüks Yalı"
                value={formData.baslik}
                onChange={handleChange}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Fiyat (₺)
              </label>
              <input
                type="number"
                name="fiyat"
                className="input-field"
                placeholder="Örn: 5000000"
                value={formData.fiyat}
                onChange={handleChange}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Oda Sayısı
                </label>
                <input
                  type="text"
                  name="oda_sayisi"
                  className="input-field"
                  placeholder="Örn: 3"
                  value={formData.oda_sayisi}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Metrekare (m²)
                </label>
                <input
                  type="number"
                  name="metrekare"
                  className="input-field"
                  placeholder="Örn: 120"
                  value={formData.metrekare}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Konum
              </label>
              <input
                type="text"
                name="konum"
                className="input-field"
                placeholder="Örn: Kadıköy, İstanbul"
                value={formData.konum}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Sağ Kolon */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Tip
                </label>
                <select name="tip" className="select-field" value={formData.tip} onChange={handleChange}>
                  <option value="Daire">Daire</option>
                  <option value="Villa">Villa</option>
                  <option value="Yalı">Yalı</option>
                  <option value="Arsa">Arsa</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Durum
                </label>
                <select name="durum" className="select-field" value={formData.durum} onChange={handleChange}>
                  <option value="Aktif">Aktif</option>
                  <option value="Pasif">Pasif</option>
                  <option value="Satıldı">Satıldı</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Emlakçı
              </label>
              <select
                name="agent_id"
                className="select-field"
                value={formData.agent_id}
                onChange={handleChange}
              >
                <option value="">— Emlakçı Seç —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {agents.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                  Henüz emlakçı eklenmemiş. <Link href="/agents" style={{ color: 'var(--accent-gold)' }}>Emlakçılar sayfasından ekle →</Link>
                </p>
              )}
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Sunum Linki (Opsiyonel)
              </label>
              <input
                type="url"
                name="sunum_url"
                className="input-field"
                placeholder="https://..."
                value={formData.sunum_url}
                onChange={handleChange}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
                Fotoğraf Linki (Opsiyonel)
              </label>
              <input
                type="url"
                name="fotograf_url"
                className="input-field"
                placeholder="https://..."
                value={formData.fotograf_url}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Açıklama */}
        <div style={{ marginTop: 24 }}>
          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8 }}>
            Açıklama
          </label>
          <textarea
            name="aciklama"
            className="textarea-field"
            placeholder="Mülk hakkında detaylı bilgi..."
            value={formData.aciklama}
            onChange={handleChange}
            style={{ minHeight: 120 }}
          />
        </div>

        {/* Submit */}
        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-subtle)', paddingTop: 24 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => router.push('/properties')}
            style={{ marginRight: 16 }}
          >
            İptal
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !formData.baslik}
            style={{ opacity: loading || !formData.baslik ? 0.5 : 1 }}
          >
            <Save size={16} />
            {loading ? 'Kaydediliyor...' : 'Mülkü Kaydet'}
          </button>
        </div>
      </form>
    </div>
  );
}
