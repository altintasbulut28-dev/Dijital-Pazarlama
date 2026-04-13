'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  BarChart3,
  Settings,
  Database,
  Crown,
  Building,
  Megaphone,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/properties', label: 'Mülk Yönetimi', icon: Building },
  { href: '/agents', label: 'Emlakçılar', icon: Users },
  { href: '/campaigns', label: 'Kampanya Merkezi', icon: Megaphone },
  { href: '/leads', label: 'Lead Listesi', icon: Users },
  { href: '/form', label: 'Lead Formu', icon: UserPlus },
  { href: '/analytics', label: 'ROI Analiz', icon: BarChart3 },
  { href: '/setup', label: 'DB Kurulum', icon: Database },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        width: 260,
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 16px',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', marginBottom: 8 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            marginBottom: 8,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dark))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Crown size={22} color="#0a0e1a" />
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: '1px',
              }}
              className="gold-text"
            >
              APEX OS
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
              LEAD MANAGEMENT
            </div>
          </div>
        </div>
      </Link>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--border-subtle)',
          margin: '8px 0 16px',
        }}
      />

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div
        style={{
          padding: '16px',
          background: 'var(--bg-glass)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
          Apex Büyüme v1.0
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Lüks Gayrimenkul Sistemi
        </div>
      </div>
    </aside>
  );
}
