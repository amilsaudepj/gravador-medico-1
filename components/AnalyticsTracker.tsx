"use client"

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import UAParser from 'ua-parser-js'
import { v4 as uuidv4 } from 'uuid'

/**
 * 🚀 ANALYTICS TRACKER NÍVEL NASA
 * 
 * Sistema de rastreamento profissional que captura:
 * - Device/OS/Browser (via ua-parser-js)
 * - Geolocalização (via API ipapi.co)
 * - UTM Parameters (campanhas de marketing)
 * - Facebook Cookies (_fbp, _fbc) para CAPI
 * - Google Click ID (gclid)
 * - Session ID persistente (localStorage)
 * 
 * Competindo com Google Analytics pela precisão!
 */
export default function AnalyticsTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    trackPageView()
  }, [pathname, searchParams])

  /**
   * Extrai um cookie específico do navegador
   */
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [key, value] = cookie.trim().split('=')
      if (key === name) return decodeURIComponent(value)
    }
    return null
  }

  /**
   * Extrai o domínio do referrer
   * Ex: https://www.instagram.com/p/xyz → instagram.com
   */
  const extractDomain = (url: string): string | null => {
    if (!url) return null
    try {
      const hostname = new URL(url).hostname
      return hostname.replace('www.', '')
    } catch {
      return null
    }
  }

  const trackPageView = async () => {
    try {
      // ============================================
      // 1. SESSÃO (Persistente no localStorage)
      // ============================================
      let sessionId = localStorage.getItem('analytics_session_id')
      if (!sessionId) {
        sessionId = uuidv4()
        localStorage.setItem('analytics_session_id', sessionId)
        console.log('🆕 Nova sessão criada:', sessionId)
      }

      // ============================================
      // 2. DEVICE/OS/BROWSER (ua-parser-js)
      // ============================================
      const parser = new (UAParser as any)(navigator.userAgent)
      const result = parser.getResult()

      const deviceType = result.device.type || 'desktop' // mobile, tablet, desktop
      const os = result.os.name || 'Desconhecido' // iOS, Android, Windows, macOS
      const browser = result.browser.name || 'Desconhecido' // Chrome, Safari, Firefox
      const browserVersion = result.browser.version || ''

      // ============================================
      // 3. UTM PARAMETERS (Campanhas de Marketing)
      // ============================================
      const utmSource = searchParams?.get('utm_source') || null
      const utmMedium = searchParams?.get('utm_medium') || null
      const utmCampaign = searchParams?.get('utm_campaign') || null
      const utmContent = searchParams?.get('utm_content') || null
      const utmTerm = searchParams?.get('utm_term') || null

      // Salvar UTMs no sessionStorage (para manter durante a navegação)
      if (utmSource) sessionStorage.setItem('utm_source', utmSource)
      if (utmMedium) sessionStorage.setItem('utm_medium', utmMedium)
      if (utmCampaign) sessionStorage.setItem('utm_campaign', utmCampaign)

      // Recuperar UTMs salvos (caso página atual não tenha UTM na URL)
      const savedUtmSource = utmSource || sessionStorage.getItem('utm_source')
      const savedUtmMedium = utmMedium || sessionStorage.getItem('utm_medium')
      const savedUtmCampaign = utmCampaign || sessionStorage.getItem('utm_campaign')

      // ============================================
      // 4. GOOGLE/FACEBOOK CLICK IDs (Para CAPI)
      // ============================================
      const gclid = searchParams?.get('gclid') || null // Google Ads
      const fbclid = searchParams?.get('fbclid') || null // Facebook Ads

      // Facebook Cookies (_fbp e _fbc) - Crucial para API de Conversão
      const fbp = getCookie('_fbp')
      const fbc = getCookie('_fbc') || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : null)

      // ============================================
      // 5. GEOLOCALIZAÇÃO (IP -> Cidade/Estado/País)
      // ============================================
      let geoData = { 
        ip: null as string | null, 
        country: null as string | null, 
        region: null as string | null, 
        city: null as string | null 
      }

      try {
        const geoResponse = await fetch('https://ipapi.co/json/')
        if (geoResponse.ok) {
          const geo = await geoResponse.json()
          geoData = {
            ip: geo.ip || null,
            country: geo.country_name || null,
            region: geo.region || null,
            city: geo.city || null
          }
        }
      } catch (geoError) {
        console.warn('⚠️ Não foi possível obter geolocalização:', geoError)
      }

      // ============================================
      // 6. REFERRER (De onde o usuário veio)
      // ============================================
      const referrer = document.referrer || null
      const referrerDomain = referrer ? extractDomain(referrer) : null

      // ============================================
      // 7. MONTAR OBJETO COMPLETO
      // ============================================
      const visitData = {
        // Página e Sessão
        page_path: pathname,
        session_id: sessionId,
        
        // Device/Tecnologia
        device_type: deviceType,
        os: os,
        browser: browser,
        browser_version: browserVersion,
        user_agent: navigator.userAgent,
        
        // Geolocalização
        ip_address: geoData.ip,
        country: geoData.country,
        region: geoData.region,
        city: geoData.city,
        
        // Origem do Tráfego
        referrer: referrer,
        referrer_domain: referrerDomain,
        utm_source: savedUtmSource,
        utm_medium: savedUtmMedium,
        utm_campaign: savedUtmCampaign,
        utm_content: utmContent,
        utm_term: utmTerm,
        
        // Rastreamento de Ads
        gclid: gclid,
        fbclid: fbclid,
        fbc: fbc,
        fbp: fbp,
        
        // Status Online
        is_online: true,
        last_seen: new Date().toISOString()
      }

      // ============================================
      // 8. SALVAR NO SUPABASE
      // ============================================
      const { error } = await supabase
        .from('analytics_visits')
        .insert(visitData)

      if (error) {
        console.error('❌ Erro ao registrar visita:', error)
      } else {
        console.log('✅ Visita registrada:', {
          page: pathname,
          device: deviceType,
          os: os,
          city: geoData.city,
          source: savedUtmSource || referrerDomain || 'direto'
        })
      }
    } catch (err) {
      console.error('💥 Erro no analytics tracker:', err)
    }
  }

  return null // Componente invisível
}
