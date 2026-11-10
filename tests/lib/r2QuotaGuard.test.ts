import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  checkR2QuotaAllowance,
  recordSuccessfulR2Upload,
  getR2QuotaStatus,
  setManualR2CircuitBreaker,
  R2_LIMITS,
} from '@/lib/r2QuotaGuard';

describe('R2 Quota Guard & Circuit Breaker', () => {
  it('allows upload within standard quota thresholds', () => {
    const status = getR2QuotaStatus();
    assert.strictEqual(status.isCircuitBreakerTripped, false);
    const check = checkR2QuotaAllowance(1024);
    assert.strictEqual(check.allowed, true);
  });

  it('records upload and increments counters correctly', () => {
    const before = getR2QuotaStatus().dailyUploadCount;
    recordSuccessfulR2Upload(50000);
    const after = getR2QuotaStatus().dailyUploadCount;
    assert.strictEqual(after, before + 1);
  });

  it('manual lock trips circuit breaker immediately', () => {
    setManualR2CircuitBreaker(true);
    const check = checkR2QuotaAllowance(100);
    assert.strictEqual(check.allowed, false);
    assert.ok(check.reason?.includes('Manual Circuit Breaker'));

    // Reset lock
    setManualR2CircuitBreaker(false);
    const checkReset = checkR2QuotaAllowance(100);
    assert.strictEqual(checkReset.allowed, true);
  });
});

