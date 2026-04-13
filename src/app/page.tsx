'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, ArrowRight, Crown } from 'lucide-react';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams?.get('code');

  useEffect(() => {
    if (inviteCode) {
      setPassword(inviteCode);
    }
  }, [inviteCode]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. AJANS SAHİBİ (ADMİN) GİRİŞİ
    if (password === 'PATRON') {
      localStorage.setItem('apex_role', 'admin');
      router.push('/dashboard');
      return;
    }

    // 2. EMLAKÇI GİRİŞİ — Supabase'den doğrula
    const { createClient } = await import('@supabase/supabase-js');
    const sb = createClient(
      'https://kenzsbokntqlrzxneund.supabase.co',
      'sb_publishable_zEr9bXRSOh45vH12sw4g1Q_yuyh4xI0'
    );

    const { data: agent, error } = await sb
      .from('agents')
      .select('*')
      .eq('email', email.trim())
      .eq('password', password.trim())
      .eq('is_active', true)
      .maybeSingle();

    if (agent) {
      localStorage.setItem('apex_role', 'agent');
      localStorage.setItem('agent_id', agent.id);
      localStorage.setItem('agent_email', agent.email);
      localStorage.setItem('agent_name', agent.name);
      router.push('/portal');
      return;
    }

    setErrorMsg(error ? 'Bir hata oluştu, tekrar deneyin.' : 'E-posta veya şifre hatalı. Lütfen kontrol edin.');
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a1128' }}>
      {/* Sol Taraf - Lüks Görsel Alanı */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(212,168,83,0.15) 0%, #0a1128 100%)' }} />
        <div style={{ position: 'absolute', bottom: 60, left: 60, maxWidth: 500 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,168,83,0.2)', color: 'var(--accent-gold)', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, backdropFilter: 'blur(10px)', marginBottom: 24 }}>
            <Crown size={16} /> APEX YÖNETİM SİSTEMİ
          </div>
          <h1 style={{ fontSize: 48, fontWeight: 900, color: '#fff', marginBottom: 16, lineHeight: 1.1, letterSpacing: '-1px' }}>
            Lüks<br/>Gayrimenkul<br/><span className="gold-text">Satış Makinesi</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18, lineHeight: 1.6 }}>
            Acentenize atanmış fırsatları görmek ve randevularınızı takip etmek için giriş yapın.
          </p>
        </div>
      </div>

      {/* Sağ Taraf - Giriş Formu */}
      <div style={{ width: '100%', maxWidth: 500, padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative', zIndex: 10 }}>

        <div className="glass-card" style={{ padding: 40, borderRadius: 24 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'rgba(212,168,83,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
            <Lock size={32} color="var(--accent-gold)" />
          </div>

          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Sisteme Giriş</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 32 }}>
            {inviteCode
              ? "Davet kodunuz onaylandı. Kendi adınızı yazarak portala erişebilirsiniz."
              : "Lütfen size verilen acente giriş kodunu veya e-postanızı girin."}
          </p>

          <form onSubmit={handleLogin}>
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid var(--hot)', padding: 16, borderRadius: 8, marginBottom: 24, fontSize: 14, color: '#fff' }}>
                {errorMsg}
              </div>
            )}

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>E-POSTA VEYA ADINIZ</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  required
                  placeholder="isim@emlakofisi.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  style={{ background: 'rgba(255,255,255,0.03)', paddingLeft: 46 }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 600 }}>DAVET KODU / ŞİFRE</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="var(--text-muted)" style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  placeholder={inviteCode ? "••••••••" : "Acente Kodunuz (Şifre)"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-field"
                  style={{ background: 'rgba(255,255,255,0.03)', paddingLeft: 46 }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ width: '100%', padding: '16px', fontSize: 16, display: 'flex', justifyContent: 'center' }}
            >
              {loading ? 'Sisteme Bağlanılıyor...' : (
                <>Giriş Yap <ArrowRight size={18} /></>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: 'var(--text-muted)' }}>
            Eğer bir sorun yaşıyorsanız ajans yöneticinizle irtibat kurun.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 20 }}>
             <Link href="/form" style={{ color: 'var(--accent-gold)', fontSize: 12, textDecoration: 'underline' }}>Müşteri Formuna Git</Link>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RootGateway() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0a1128' }} />}>
      <LoginForm />
    </Suspense>
  );
}
