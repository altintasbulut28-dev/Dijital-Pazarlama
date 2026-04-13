import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lead Formu — APEX OS',
  description: 'Lüks gayrimenkul danışmanlığı için bilgilerinizi paylaşın. Hayalinizdeki mülkü bulmak için size özel hizmet sunalım.',
};

export default function FormLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
