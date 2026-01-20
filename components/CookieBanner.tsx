"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'

/**
 * 🍪 BANNER DE CONSENTIMENTO LGPD - Minimalista
 * 
 * - ID do site para compliance
 * - Design limpo e não obstrutivo
 * - Permite navegar sem decisão obrigatória
 * - Sem overlay/blur no fundo
 */
export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Verificar se usuário já interagiu com o banner
    const consent = localStorage.getItem('cookie_consent')
    
    if (!consent) {
      // Mostrar banner após 2 segundos
      setTimeout(() => {
        setShowBanner(true)
      }, 2000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    setShowBanner(false)
    
    // Disparar evento para iniciar tracking
    window.dispatchEvent(new Event('cookieConsentGiven'))
  }

  const handleReject = () => {
    localStorage.setItem('cookie_consent', 'rejected')
    localStorage.setItem('cookie_consent_date', new Date().toISOString())
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-4xl px-4 animate-slide-up">
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-lg shadow-2xl border border-emerald-400/30">
        
        <div className="px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Conteúdo - horizontal */}
          <div className="flex items-center gap-4 flex-1">
            <span className="text-2xl flex-shrink-0">🍪</span>
            <div className="flex-1">
              <p className="text-white text-sm leading-relaxed">
                Usamos cookies para melhorar sua experiência. 
                <span className="mx-2">•</span>
                <Link 
                  href="/politica-privacidade" 
                  className="underline hover:text-emerald-100 transition-colors"
                >
                  Política de Privacidade
                </Link>
              </p>
            </div>
          </div>

          {/* Botões - horizontal */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-6 py-2 bg-white hover:bg-emerald-50 text-emerald-700 text-sm font-medium rounded-md transition-colors shadow-sm"
            >
              Aceitar
            </button>
            <button
              onClick={handleReject}
              className="px-4 py-2 text-white/90 hover:text-white text-sm font-medium transition-colors"
            >
              Recusar
            </button>
            <button
              onClick={() => setShowBanner(false)}
              className="text-white/70 hover:text-white transition-colors ml-1"
              aria-label="Fechar"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        </div>
      </div>

      {/* Animação */}
      <style jsx>{`
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(20px); 
          }
          to { 
            opacity: 1;
            transform: translateY(0); 
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
