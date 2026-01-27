// ========================================
// 🛡️ CHECKOUT VALIDATORS (Zod Schemas)
// ========================================
// OWASP ASVS L2 Compliant Input Validation
// ========================================

import { z } from 'zod';

// =====================================================
// 🔐 CPF Validation (Brazilian Tax ID)
// =====================================================
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$|^\d{11}$/;

function validateCPF(cpf: string): boolean {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // Rejeita sequências iguais
  
  // Validação dos dígitos verificadores
  let sum = 0;
  let remainder: number;
  
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

// =====================================================
// 📱 Phone Validation (Brazilian Format)
// =====================================================
const phoneRegex = /^\+?55\s?(?:\(?\d{2}\)?\s?)?\d{4,5}-?\d{4}$/;

// =====================================================
// 💳 SCHEMA: Checkout Request
// =====================================================
export const CheckoutRequestSchema = z.object({
  // Tokenização (PCI Compliance - NUNCA enviar dados brutos do cartão)
  mercadopagoToken: z.string().min(10, 'Token do Mercado Pago inválido'),
  appmaxToken: z.string().min(10, 'Token do AppMax inválido'),
  
  // Dados do Cliente
  customer: z.object({
    email: z.string()
      .email('Email inválido')
      .max(255)
      .toLowerCase()
      .trim(),
    
    name: z.string()
      .min(3, 'Nome deve ter no mínimo 3 caracteres')
      .max(255)
      .trim()
      .refine(
        (name) => /^[a-zA-ZÀ-ÿ\s]+$/.test(name),
        'Nome deve conter apenas letras'
      ),
    
    cpf: z.string()
      .refine((cpf) => cpfRegex.test(cpf), 'CPF deve estar no formato XXX.XXX.XXX-XX ou apenas números')
      .refine(validateCPF, 'CPF inválido'),
    
    phone: z.string()
      .optional()
      .refine(
        (phone) => !phone || phoneRegex.test(phone),
        'Telefone deve estar no formato +55 (XX) XXXXX-XXXX'
      ),
  }),
  
  // Produto
  product: z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(255),
    amount: z.number()
      .positive('Valor deve ser positivo')
      .min(0.01, 'Valor mínimo é R$ 0,01')
      .max(999999.99, 'Valor máximo é R$ 999.999,99'),
  }),
  
  // Anti-Bot (Cloudflare Turnstile)
  turnstileToken: z.string().optional(), // Temporariamente opcional para testes
  
  // Idempotência
  idempotencyKey: z.string()
    .uuid('Chave de idempotência deve ser um UUID válido')
    .optional(), // Se não enviado, será gerado no backend
  
  // Metadados (opcional)
  metadata: z.record(z.string(), z.any()).optional(),
});

export type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// =====================================================
// 🔄 SCHEMA: Webhook Payload (Mercado Pago)
// =====================================================
export const MercadoPagoWebhookSchema = z.object({
  id: z.number().or(z.string()),
  action: z.string(),
  api_version: z.string().optional(),
  data: z.object({
    id: z.string(),
  }),
  date_created: z.string(),
  live_mode: z.boolean(),
  type: z.enum(['payment', 'subscription', 'plan', 'invoice']),
  user_id: z.string().optional(),
});

export type MercadoPagoWebhook = z.infer<typeof MercadoPagoWebhookSchema>;

// =====================================================
// 🔐 SCHEMA: Webhook Signature Validation
// =====================================================
export const WebhookSignatureSchema = z.object({
  'x-signature': z.string().min(1, 'Assinatura ausente'),
  'x-request-id': z.string().min(1, 'Request ID ausente'),
});

// =====================================================
// 🚀 SCHEMA: Lovable Provisioning
// =====================================================
export const ProvisioningRequestSchema = z.object({
  orderId: z.string().uuid(),
  userEmail: z.string().email(),
  userName: z.string().min(1),
  productId: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type ProvisioningRequest = z.infer<typeof ProvisioningRequestSchema>;

// =====================================================
// 📊 SCHEMA: Dashboard Filters
// =====================================================
export const DashboardFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  gateway: z.enum(['mercadopago', 'appmax', 'all']).default('all'),
  status: z.enum(['pending', 'paid', 'failed', 'canceled', 'refunded', 'all']).default('all'),
});

export type DashboardFilters = z.infer<typeof DashboardFiltersSchema>;

// =====================================================
// 🔧 HELPER: Sanitização de CPF para Logs
// =====================================================
export function sanitizeCPF(cpf: string): string {
  // Remove todos os caracteres não numéricos
  return cpf.replace(/\D/g, '');
}

// =====================================================
// 🔧 HELPER: Validação de IP (Prevenir SSRF)
// =====================================================
export function isValidPublicIP(ip: string): boolean {
  // Rejeita IPs privados/localhost
  const privateRanges = [
    /^127\./,           // Loopback
    /^10\./,            // Private Class A
    /^172\.(1[6-9]|2\d|3[01])\./, // Private Class B
    /^192\.168\./,      // Private Class C
    /^169\.254\./,      // Link-local
    /^::1$/,            // IPv6 loopback
    /^fe80:/,           // IPv6 link-local
  ];
  
  return !privateRanges.some(regex => regex.test(ip));
}

// =====================================================
// 🔧 HELPER: Rate Limit Key Generator
// =====================================================
export function generateRateLimitKey(
  ip: string,
  endpoint: string,
  userId?: string
): string {
  return userId 
    ? `rate_limit:user:${userId}:${endpoint}`
    : `rate_limit:ip:${ip}:${endpoint}`;
}

// =====================================================
// ✅ Exportar todos os schemas
// =====================================================
export const validators = {
  checkout: CheckoutRequestSchema,
  webhook: MercadoPagoWebhookSchema,
  webhookSignature: WebhookSignatureSchema,
  provisioning: ProvisioningRequestSchema,
  dashboardFilters: DashboardFiltersSchema,
};
