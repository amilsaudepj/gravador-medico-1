/**
 * =====================================================
 * TRACKING MODULE - Index
 * =====================================================
 * Re-exporta todas as funções de tracking
 * para uso simplificado em outras partes do código
 * =====================================================
 */

// Core tracking functions
export {
  trackEvent,
  trackPurchase,
  trackInitiateCheckout,
  trackAddToCart,
  trackLead,
  validateCapiPayload,
  createTestPayload,
  type TrackingEventType,
  type TrackingUserData,
  type TrackingEventData,
  type TrackingPayload,
  type TrackingResult,
} from './core';

// Test utilities
export { runTrackingTests } from './core.test';
