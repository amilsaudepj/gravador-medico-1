"use client"

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { CheckCircle, Mail, MessageCircle, ArrowRight, Sparkles, Gift } from 'lucide-react'

function ObrigadoContent() {
  const searchParams = useSearchParams()
  const email = searchParams?.get('email') || 'seu email'
  const orderId = searchParams?.get('order_id')
  const [showConfetti, setShowConfetti] = useState(true)

  useEffect(() => {
    // Confetti desaparece após 3 segundos
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                top: -20, 
                left: `${Math.random() * 100}%`,
                opacity: 1,
                scale: 1,
              }}
              animate={{ 
                top: '100%',
                opacity: 0,
                rotate: Math.random() * 360,
                scale: 0,
              }}
              transition={{
                duration: 2 + Math.random() * 2,
                ease: "easeOut",
                delay: Math.random() * 0.5,
              }}
              className={`absolute w-3 h-3 ${
                ['bg-green-500', 'bg-emerald-500', 'bg-yellow-500', 'bg-blue-500', 'bg-purple-500'][i % 5]
              } rounded-full`}
            />
          ))}
        </div>
      )}

      <div className="max-w-3xl w-full">
        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-green-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl">
              <CheckCircle className="w-16 h-16 text-white" strokeWidth={3} />
            </div>
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
              🎉 Pagamento Confirmado!
            </h1>
            <p className="text-xl text-gray-600 font-semibold">
              Bem-vindo(a) ao <span className="text-brand-600">Método Gravador Médico</span>
            </p>
            {orderId && (
              <p className="text-sm text-gray-500 mt-2">
                Pedido #{orderId}
              </p>
            )}
          </div>

          {/* Access Info */}
          <div className="bg-gradient-to-br from-brand-50 to-emerald-50 rounded-2xl p-6 mb-6 border-2 border-brand-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-brand-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  ✅ Seu acesso já foi liberado!
                </h3>
                <p className="text-gray-700 mb-2">
                  Enviamos seus <strong>dados de acesso</strong> para:
                </p>
                <p className="text-brand-600 font-bold text-lg mb-3 break-all">
                  📧 {email}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Importante:</strong> Verifique sua <strong>caixa de entrada</strong> e também a pasta de <strong>SPAM</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Próximos Passos
            </h3>
            
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <p className="text-gray-700 pt-1">
                  <strong>Verifique seu email</strong> e anote suas credenciais de acesso
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <p className="text-gray-700 pt-1">
                  <strong>Acesse sua conta</strong> usando o email e senha que você recebeu
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-brand-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <p className="text-gray-700 pt-1">
                  <strong>Precisa de ajuda?</strong> Entre em contato pelo WhatsApp: +55 21 98645-1821
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <a
              href="https://wa.me/5521986451821?text=Olá!%20Acabei%20de%20comprar%20o%20Gravador%20Médico%20e%20gostaria%20de%20obter%20meus%20dados%20de%20acesso."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-green-500/30 transition-all group"
            >
              <MessageCircle className="w-5 h-5" />
              Falar com Suporte no WhatsApp
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>

            <div className="text-center text-sm text-gray-500 pt-2">
              <p>📱 WhatsApp: +55 21 98645-1821</p>
            </div>
          </div>
        </motion.div>

        {/* Bonus Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-6 border border-purple-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                🎁 Bônus Exclusivos
              </h3>
              <p className="text-gray-700">
                Você também ganhou acesso a todos os <strong>bônus exclusivos</strong> da sua compra. 
                Confira tudo na área de membros!
              </p>
            </div>
          </div>
        </motion.div>

        {/* Support Info */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p>
            📞 Suporte via WhatsApp:{' '}
            <a 
              href="https://wa.me/5521986451821" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-green-600 font-semibold hover:underline"
            >
              +55 21 98645-1821
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ObrigadoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    }>
      <ObrigadoContent />
    </Suspense>
  )
}
