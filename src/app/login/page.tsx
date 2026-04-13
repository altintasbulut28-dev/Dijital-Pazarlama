'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/');
  }, [router]);

  return <div style={{ background: '#0a1128', minHeight: '100vh' }}>Yönlendiriliyorsunuz...</div>;
}
