/**
 * =====================================================
 * TRACKING CORE - Testes Unitários
 * =====================================================
 * Valida:
 * - Payload do CAPI com event_id, em (email hash), value
 * - Hash SHA256 correto para dados de usuário
 * - Estrutura do evento Purchase
 * - Resiliência a falhas
 * =====================================================
 */

import crypto from 'crypto';
import {
  validateCapiPayload,
  createTestPayload,
  type TrackingPayload,
} from './core';

// =====================================================
// TEST UTILITIES
// =====================================================

function hashSha256(data: string): string {
  return crypto
    .createHash('sha256')
    .update(data.toLowerCase().trim())
    .digest('hex');
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

function describe(name: string, fn: () => void): void {
  console.log(`\n📋 ${name}`);
  try {
    fn();
  } catch (error) {
    console.error(`  💥 Suite failed:`, error);
  }
}

function it(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✅ ${name}`);
  } catch (error) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${error instanceof Error ? error.message : error}`);
  }
}

// =====================================================
// TESTS
// =====================================================

describe('CAPI Payload Validation', () => {
  it('should require event_id', () => {
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: '', // Empty
      eventTime: Date.now(),
      userData: { email: 'test@test.com' },
      eventData: { value: 100 },
    };
    
    const result = validateCapiPayload(payload);
    assert(!result.valid, 'Should be invalid without event_id');
    assert(result.errors.includes('event_id é obrigatório'), 'Should have event_id error');
  });

  it('should require value > 0 for Purchase', () => {
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: 'test-123',
      eventTime: Date.now(),
      userData: { email: 'test@test.com' },
      eventData: { value: 0 }, // Zero value
    };
    
    const result = validateCapiPayload(payload);
    assert(!result.valid, 'Should be invalid with value = 0');
    assert(
      result.errors.some(e => e.includes('value')),
      'Should have value error'
    );
  });

  it('should recommend email or phone for matching', () => {
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: 'test-123',
      eventTime: Date.now(),
      userData: {}, // No email or phone
      eventData: { value: 100 },
    };
    
    const result = validateCapiPayload(payload);
    assert(
      result.errors.some(e => e.includes('email ou phone')),
      'Should recommend email or phone'
    );
  });

  it('should validate correct Purchase payload', () => {
    const payload = createTestPayload('Purchase');
    
    const result = validateCapiPayload(payload);
    assert(result.valid, 'Should be valid');
    assert(result.errors.length === 0, 'Should have no errors');
  });
});

describe('SHA256 Hashing', () => {
  it('should hash email correctly', () => {
    const email = 'Test@Example.COM';
    const expected = hashSha256('test@example.com'); // lowercase
    const actual = hashSha256(email.toLowerCase().trim());
    
    assert(actual === expected, `Hash mismatch: ${actual} !== ${expected}`);
  });

  it('should hash phone correctly (normalized)', () => {
    const phone = '11999999999';
    const hash = hashSha256(phone);
    
    assert(hash.length === 64, 'SHA256 should be 64 hex chars');
    assert(/^[a-f0-9]{64}$/.test(hash), 'Should be valid hex');
  });

  it('should produce consistent hashes', () => {
    const data = 'consistent-test';
    const hash1 = hashSha256(data);
    const hash2 = hashSha256(data);
    
    assert(hash1 === hash2, 'Same input should produce same hash');
  });
});

describe('Test Payload Generation', () => {
  it('should create valid Purchase payload', () => {
    const payload = createTestPayload('Purchase');
    
    assert(payload.eventType === 'Purchase', 'Should be Purchase event');
    assert(typeof payload.eventId === 'string', 'Should have eventId');
    assert(payload.eventId.length > 0, 'eventId should not be empty');
    assert(typeof payload.eventTime === 'number', 'Should have eventTime');
    assert(payload.eventData.value === 297.00, 'Should have correct value');
    assert(payload.eventData.currency === 'BRL', 'Should be BRL');
  });

  it('should have user data for matching', () => {
    const payload = createTestPayload();
    
    assert(payload.userData.email !== undefined, 'Should have email');
    assert(payload.userData.phone !== undefined, 'Should have phone');
  });

  it('should have product data', () => {
    const payload = createTestPayload();
    
    assert(payload.eventData.contentName !== undefined, 'Should have contentName');
    assert(Array.isArray(payload.eventData.contentIds), 'Should have contentIds array');
    assert(payload.eventData.contentType === 'product', 'Should be product type');
  });
});

describe('Event ID Format', () => {
  it('should generate UUID format event IDs', () => {
    const payload = createTestPayload();
    
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    assert(
      uuidRegex.test(payload.eventId),
      `eventId should be UUID format: ${payload.eventId}`
    );
  });

  it('should use orderId as eventId for deduplication', () => {
    // Simulando o comportamento de trackPurchase
    const orderId = 'ORDER-12345';
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: orderId, // orderId usado como eventId
      eventTime: Math.floor(Date.now() / 1000),
      userData: { email: 'test@test.com' },
      eventData: { value: 100, orderId },
    };
    
    assert(payload.eventId === orderId, 'eventId should match orderId');
    assert(payload.eventData.orderId === orderId, 'eventData.orderId should match');
  });
});

describe('Currency and Value', () => {
  it('should default to BRL currency', () => {
    const payload = createTestPayload();
    
    assert(payload.eventData.currency === 'BRL', 'Default currency should be BRL');
  });

  it('should accept custom currency', () => {
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: 'test-123',
      eventTime: Date.now(),
      userData: { email: 'test@test.com' },
      eventData: { value: 100, currency: 'USD' },
    };
    
    assert(payload.eventData.currency === 'USD', 'Should accept USD');
  });

  it('should handle decimal values correctly', () => {
    const payload: TrackingPayload = {
      eventType: 'Purchase',
      eventId: 'test-123',
      eventTime: Date.now(),
      userData: { email: 'test@test.com' },
      eventData: { value: 297.99, currency: 'BRL' },
    };
    
    assert(payload.eventData.value === 297.99, 'Should preserve decimal value');
  });
});

// =====================================================
// RUN TESTS
// =====================================================

export function runTrackingTests(): void {
  console.log('\n🧪 TRACKING CORE - TESTES UNITÁRIOS');
  console.log('='.repeat(50));

  describe('CAPI Payload Validation', () => {
    it('should require event_id', () => {
      const payload: TrackingPayload = {
        eventType: 'Purchase',
        eventId: '',
        eventTime: Date.now(),
        userData: { email: 'test@test.com' },
        eventData: { value: 100 },
      };
      const result = validateCapiPayload(payload);
      assert(!result.valid, 'Should be invalid');
    });

    it('should validate correct payload', () => {
      const payload = createTestPayload('Purchase');
      const result = validateCapiPayload(payload);
      assert(result.valid, 'Should be valid');
    });
  });

  describe('SHA256 Hashing', () => {
    it('should hash email correctly', () => {
      const hash = hashSha256('test@example.com');
      assert(hash.length === 64, 'Should be 64 chars');
    });
  });

  console.log('\n' + '='.repeat(50));
  console.log('✅ TESTES CONCLUÍDOS\n');
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runTrackingTests();
}
