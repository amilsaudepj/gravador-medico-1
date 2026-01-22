/**
 * Layout para o Módulo de Tracking
 * Estrutura compartilhada para todas as páginas de /admin/tracking
 */

import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tracking | Gravador Médico',
  description: 'Gerenciamento de rastreamento e atribuição',
};

export default function TrackingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {children}
      </div>
    </div>
  );
}
