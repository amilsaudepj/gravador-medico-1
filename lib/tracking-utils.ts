/**
 * Utilitários para Tracking e Atribuição
 * Funções auxiliares para geração de códigos e IDs únicos
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Gera um código de referência curto único (6 caracteres)
 * Formato: Alfanumérico uppercase (ex: "A3X9K2")
 * 
 * @returns Código de referência de 6 caracteres
 */
export function generateRefCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let refCode = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    refCode += chars[randomIndex];
  }
  
  return refCode;
}

/**
 * Gera um Event ID único usando UUID v4
 * Usado para rastreamento no Meta Pixel (Conversions API)
 * 
 * @returns UUID v4
 */
export function generateEventId(): string {
  return uuidv4();
}

/**
 * Valida se um código de referência tem formato válido
 * 
 * @param refCode - Código a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidRefCode(refCode: string): boolean {
  if (!refCode || typeof refCode !== 'string') {
    return false;
  }
  
  // Deve ter exatamente 6 caracteres alfanuméricos uppercase
  return /^[A-Z0-9]{6}$/.test(refCode);
}

/**
 * Extrai o código de referência de uma mensagem do WhatsApp
 * Procura por padrões como "ref:XXXXXX" ou "REF:XXXXXX"
 * 
 * @param message - Mensagem do WhatsApp
 * @returns Código de referência encontrado ou null
 */
export function extractRefCodeFromMessage(message: string): string | null {
  if (!message) {
    return null;
  }
  
  // Procura por "ref:XXXXXX" (case insensitive)
  const regex = /ref:([A-Z0-9]{6})/i;
  const match = message.match(regex);
  
  if (match && match[1]) {
    return match[1].toUpperCase();
  }
  
  return null;
}

/**
 * Formata número de WhatsApp para padrão internacional
 * Remove caracteres especiais e garante formato correto
 * 
 * @param phoneNumber - Número de telefone
 * @returns Número formatado (ex: "5511999999999")
 */
export function formatWhatsAppNumber(phoneNumber: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Se já tem código do país, retorna
  if (cleaned.startsWith('55') && cleaned.length >= 12) {
    return cleaned;
  }
  
  // Se não tem código do país, adiciona 55 (Brasil)
  if (cleaned.length === 11) {
    return '55' + cleaned;
  }
  
  return cleaned;
}

/**
 * Gera URL do WhatsApp com mensagem pré-preenchida
 * 
 * @param phoneNumber - Número do WhatsApp
 * @param message - Mensagem pré-preenchida
 * @param refCode - Código de referência (opcional)
 * @returns URL do WhatsApp
 */
export function generateWhatsAppURL(
  phoneNumber: string,
  message: string,
  refCode?: string
): string {
  const formattedNumber = formatWhatsAppNumber(phoneNumber);
  let finalMessage = message;
  
  // Adiciona ref code à mensagem se fornecido
  if (refCode) {
    finalMessage += `\n\nref:${refCode}`;
  }
  
  const encodedMessage = encodeURIComponent(finalMessage);
  return `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
}

/**
 * Valida se uma URL é válida
 * 
 * @param url - URL a ser validada
 * @returns true se válida, false caso contrário
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gera slug único a partir de um texto
 * Remove acentos, caracteres especiais e espaços
 * 
 * @param text - Texto para gerar slug
 * @returns Slug formatado
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, '-') // Substitui espaços por hífens
    .replace(/-+/g, '-') // Remove hífens duplicados
    .trim();
}

/**
 * Calcula taxa de conversão
 * 
 * @param conversions - Número de conversões
 * @param clicks - Número total de cliques
 * @returns Taxa de conversão em percentual (0-100)
 */
export function calculateConversionRate(conversions: number, clicks: number): number {
  if (clicks === 0) {
    return 0;
  }
  
  return Math.round((conversions / clicks) * 100 * 100) / 100; // 2 casas decimais
}

/**
 * Formata data para exibição
 * 
 * @param dateString - String de data ISO
 * @returns Data formatada (ex: "22/01/2026 15:30")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Gera hash SHA-256 de um texto (para emails, phones no Meta Pixel)
 * 
 * @param text - Texto para gerar hash
 * @returns Hash SHA-256
 */
export async function hashSHA256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
