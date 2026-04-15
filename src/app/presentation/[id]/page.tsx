'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { supabase, type Property } from '@/lib/supabase';
import { Sparkles, Calendar, MapPin, CheckCircle, Video, Image as ImageIcon } from 'lucide-react';

export default function PresentationPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const propertyId = params?.id as string;
  const leadId = searchParams?.get('lead');

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [appointmentStatus, setAppointmentStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [resolvedLeadId, setResolvedLeadId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [tempPhone, setTempPhone] = useState('');

  useEffect(() => {
    // URL'de lead id yoksa bile localstorage'dan tanıyoruz
    const storedLead = typeof window !== 'undefined' ? localStorage.getItem('apex_lead_id') : null;
    setResolvedLeadId(leadId || storedLead);

    if (propertyId) {
      async function fetchProperty() {
        const { data } = await supabase.from('properties').select('*').eq('id', propertyId).single();
        if (data) setProperty(data as Property);
        setLoading(false);
      }
      fetchProperty();
    }
  }, [propertyId, leadId]);

  useEffect(() => {
    if (!selectedDate) return;

    async function fetchBookings() {
      // Seçili gündeki tüm dolu saatleri Supabase üzerinden sorgula
      const startOfDay = new Date(`${selectedDate}T00:00:00`);
      const endOfDay = new Date(`${selectedDate}T23:59:59`);

      const { data } = await supabase
        .from('reminders')
        .select('reminder_date')
        .gte('reminder_date', startOfDay.toISOString())
        .lte('reminder_date', endOfDay.toISOString());

      if (data) {
        const booked = data.map(r => {
          const d = new Date(r.reminder_date);
          const hrs = d.getHours().toString().padStart(2, '0');
          const mins = d.getMinutes().toString().padStart(2, '0');
          return `${hrs}:${mins}`;
        });
        setBookedSlots(booked);
      }
    }

    fetchBookings();
    setSelectedTime(''); // Gün değişince saati sıfırla
  }, [selectedDate]);

  async function requestAppointment() {
    if (!selectedDate || !selectedTime) {
      alert("Lütfen bir tarih ve saat seçin.");
      return;
    }

    if (selectedTime > '16:00') {
      alert("En geç saat 16:00 seçebilirsiniz.");
      setSelectedTime('16:00');
      return;
    }

    if (bookedSlots.includes(selectedTime)) {
      alert("Seçtiğiniz saat (" + selectedTime + ") başka bir müşterimize ayrılmıştır. Lütfen farklı bir saat seçin.");
      return;
    }

    setAppointmentStatus('loading');

    // Eğer tarayıcıda kimlik varsa o müşteriyi eşleştiriyoruz, yoksa anonim
    const currentLeadId = resolvedLeadId;
    let leadMessageName = 'Bilinmeyen Müşteri';
    let leadMessagePhone = 'Gizli';

    if (currentLeadId) {
      const { data: leadData } = await supabase.from('leads').select('full_name, phone').eq('id', currentLeadId).single();
      if (leadData) {
        leadMessageName = leadData.full_name;
        leadMessagePhone = leadData.phone;
      }
      // Durumu 'randevu' yap
      await supabase.from('leads').update({ status: 'randevu' }).eq('id', currentLeadId);
      
      // Not düş
      await supabase.from('notes').insert([{
        lead_id: currentLeadId,
        content: `TAKVİM: Müşteri "${property?.baslik}" için randevu takviminden saat aldı.\n📅 Seçilen Tarih: ${selectedDate}\n⏰ Saat: ${selectedTime}`,
        note_type: 'meeting',
      }]);

      // Başkası aynı saati alamasın diye Reminders tablosuna takvim bloğu at
      const appointmentDateIso = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();
      await supabase.from('reminders').insert({
        lead_id: currentLeadId,
        reminder_date: appointmentDateIso,
        message: `${property?.baslik} Gösterimi`,
      });
    }

    // Emlakçıya Bildirim (Telegram)
    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `🔥 TAKVİMDEN YENİ GÖRÜŞME AYARLANDI!\n\n👤 Müşteri: ${leadMessageName}\n📞 Numara: ${leadMessagePhone}\n🏠 Mülk: ${property?.baslik}\n\n📅 Tarih: ${selectedDate}\n⏰ Saat: ${selectedTime}` })
    }).catch(e => console.error("Telegram API Hatası:", e));

    setTimeout(() => {
      setAppointmentStatus('success');
    }, 1000);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="skeleton" style={{ width: 100, height: 100, borderRadius: '50%' }} />
      </div>
    );
  }

  if (!property) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <h2>Sunum bulunamadı veya süresi dolmuş.</h2>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero Section Container */}
      <div style={{ position: 'relative', height: '60vh', minHeight: 400, overflow: 'hidden' }}>
        {/* Arka plan fotoğrafı (Eğer foto yoksa gradient) */}
        <div style={{ 
          position: 'absolute', inset: 0, 
          background: property.fotograf_url ? `url(${property.fotograf_url}) center/cover no-repeat` : 'linear-gradient(135deg, var(--bg-primary), #0a1128)',
          filter: property.fotograf_url ? 'brightness(0.6)' : 'none'
        }} />
        
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg-primary) 0%, transparent 100%)' }} />

        <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 24px 40px', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(212,168,83,0.2)', color: 'var(--accent-gold)', padding: '6px 12px', borderRadius: 20, fontSize: 13, fontWeight: 700, backdropFilter: 'blur(10px)', marginBottom: 16, width: 'fit-content' }}>
            <Sparkles size={14} /> VIP MÜLK SUNUMU
          </div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: '#fff', marginBottom: 12, lineHeight: 1.1 }}>
            {property.baslik}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 16 }}>
            <MapPin size={18} color="var(--accent-gold)" />
            {property.konum || 'Özel Konum'}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div style={{ maxWidth: 800, margin: '-40px auto 0', padding: '0 24px 80px', position: 'relative', zIndex: 20 }}>
        
        {/* Info Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center', borderTop: '3px solid var(--accent-gold)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>FİYAT</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-gold)' }}>
              {property.fiyat ? `${property.fiyat.toLocaleString('tr-TR')} ₺` : 'Fiyat Sorunuz'}
            </div>
          </div>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>BÜYÜKLÜK</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{property.metrekare ? `${property.metrekare} m²` : '-'}</div>
          </div>
          <div className="glass-card" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>ODA SAYISI</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{property.oda_sayisi || '-'}</div>
          </div>
        </div>

        {/* Description */}
        <div className="glass-card" style={{ padding: 32, marginBottom: 32 }}>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
            Neden Bu Mülkü Almalısınız?
          </h3>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {property.aciklama || 'Mülk hakkında açıklamalar hazırlanıyor. Detaylı bilgi için emlak danışmanınızla iletişime geçebilirsiniz.'}
          </p>
        </div>

        {/* Media Buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 40 }}>
          {property.video_url && (
            <a href={property.video_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '16px' }}>
              <Video size={18} />
              Eve Video Turu At
            </a>
          )}
          {property.sunum_url && (
            <a href={property.sunum_url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ flex: 1, justifyContent: 'center', padding: '16px' }}>
              <ImageIcon size={18} />
              Sunumu Şimdi Gör
            </a>
          )}
        </div>

        {/* CTA (Catch) Section */}
        <div style={{ background: 'linear-gradient(135deg, rgba(212,168,83,0.1), rgba(10,14,26,1))', border: '1px solid var(--border-subtle)', borderRadius: 24, padding: 40, textAlign: 'center' }}>
          {appointmentStatus === 'success' ? (
            <div className="animate-fadeInUp">
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <CheckCircle size={32} color="var(--success)" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Talebiniz Alındı!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 400, margin: '0 auto' }}>
                Gösterim randevusu için en kısa sürede size dönüş yapacağız. Danışmanımız {property.emlakci_adi ? `${property.emlakci_adi}` : 'sizinle'} iletişime geçecek.
              </p>
            </div>
          ) : (
            <>
              <Calendar size={48} color="var(--accent-gold)" style={{ margin: '0 auto 20px', opacity: 0.8 }} />
              <h3 style={{ fontSize: 24, fontWeight: 800, color: '#fff', marginBottom: 12 }}>Yerinde Görmek İstiyorum</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
                Sunumu beğendiniz mi? Mülkü yerinde ve size özel olarak incelemek için uygun olduğunuz bir gün ve saati aşağıdan seçin.
              </p>
              
              <div style={{ maxWidth: 360, margin: '0 auto 32px', textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>📅 Görüşme Tarihi</label>
                  <input 
                    type="date" 
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="input-field"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '12px' }}
                    min={new Date().toISOString().split('T')[0]} // Dünden öncesini seçemesin
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>⏰ Tercih Edilen Saat <span style={{ fontSize: 11, opacity: 0.6 }}>(En geç 16:00)</span></label>
                  <input
                    type="time"
                    value={selectedTime}
                    min="09:00"
                    max="16:00"
                    onChange={e => {
                      const val = e.target.value;
                      if (val && val > '16:00') {
                        setSelectedTime('16:00');
                      } else {
                        setSelectedTime(val);
                      }
                    }}
                    className="input-field"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '12px', width: '100%' }}
                  />
                  {selectedTime && selectedTime > '16:00' && (
                    <div style={{ fontSize: 12, color: 'var(--hot)', marginTop: 6, fontWeight: 600 }}>
                      ⚠️ En geç saat 16:00 seçebilirsiniz.
                    </div>
                  )}
                  {bookedSlots.includes(selectedTime) && (
                    <div style={{ fontSize: 12, color: 'var(--hot)', marginTop: 6, fontWeight: 600 }}>
                      ⚠️ Bu saat dolu. Lütfen farklı seçin.
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={requestAppointment}
                disabled={appointmentStatus === 'loading' || !selectedDate || !selectedTime}
                style={{
                  background: 'var(--accent-gold)',
                  color: '#000',
                  border: 'none',
                  padding: '18px 40px',
                  borderRadius: 30,
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  transition: 'transform 0.2s',
                  transform: appointmentStatus === 'loading' ? 'scale(0.95)' : 'scale(1)',
                  opacity: appointmentStatus === 'loading' ? 0.7 : 1,
                  boxShadow: '0 10px 30px rgba(212,168,83,0.3)',
                }}
              >
                {appointmentStatus === 'loading' ? 'İşleniyor...' : (
                  <>
                    <Calendar size={18} />
                    Öncelikli Randevu Oluştur
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
