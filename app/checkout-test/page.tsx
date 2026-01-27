'use client';

import CheckoutFormV3 from '@/components/checkout/CheckoutFormV3';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function CheckoutTestPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🚀 Enterprise Checkout V3.0
          </h1>
          <p className="text-gray-600">
            Sistema de pagamento com cascata automática (Mercado Pago → AppMax)
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">🛡️</div>
            <h3 className="font-semibold text-gray-900">PCI-DSS Compliant</h3>
            <p className="text-sm text-gray-600">Dual Tokenization</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">🔄</div>
            <h3 className="font-semibold text-gray-900">Fallback Automático</h3>
            <p className="text-sm text-gray-600">+15-25% aprovação</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl mb-2">🤖</div>
            <h3 className="font-semibold text-gray-900">Anti-Bot</h3>
            <p className="text-sm text-gray-600">Cloudflare Turnstile</p>
          </div>
        </div>

        {/* Checkout Form */}
        <CheckoutFormV3
          productId="plan-enterprise"
          productName="Plano Enterprise - Gravador Médico"
          amount={297.00}
          onSuccess={(orderId) => {
            toast.success('Pagamento aprovado! 🎉');
            router.push(`/obrigado?order=${orderId}`);
          }}
          onError={(error) => {
            toast.error(error);
          }}
        />

        {/* Info adicional */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">
            ⚠️ Modo de Teste
          </h3>
          <p className="text-sm text-yellow-800 mb-2">
            Use os cartões de teste do Mercado Pago:
          </p>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>✅ <strong>Aprovado:</strong> 5031 4332 1540 6351 (CVV: 123, Validade: 12/25)</li>
            <li>❌ <strong>Rejeitado:</strong> 5031 7557 3453 0604 (CVV: 123, Validade: 12/25)</li>
            <li>📧 <strong>Email:</strong> Qualquer email válido</li>
            <li>📄 <strong>CPF:</strong> 123.456.789-09 (válido para teste)</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            📖 Documentação completa em:{' '}
            <code className="bg-gray-100 px-2 py-1 rounded">
              ENTERPRISE-CHECKOUT-GUIA.md
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
