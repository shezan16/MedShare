import assert from 'assert';
import { otpService, isEmailIdentifier, maskIdentifier } from '../src/services/otpService.ts';

async function runSimplifiedAuthTests() {
  console.log('🧪 Starting Simplified Authentication & OTP Verification Test Suite...\n');

  // --- 1. Identifier Detection & Masking ---
  console.log('--- 1. Identifier Validation & Masking ---');
  assert.strictEqual(isEmailIdentifier('alex.vance@example.com'), true, 'Valid email detected');
  assert.strictEqual(isEmailIdentifier('dr.vance@sub.medshare.org'), true, 'Complex domain email detected');
  assert.strictEqual(isEmailIdentifier('+1 (555) 019-2834'), false, 'US formatted phone is not email');
  assert.strictEqual(isEmailIdentifier('01711223344'), false, 'Direct phone digits is not email');

  assert.strictEqual(maskIdentifier('alex.vance@example.com').includes('@example.com'), true, 'Email domain preserved');
  assert.strictEqual(maskIdentifier('+1 (555) 019-2834').includes('2834'), true, 'Phone last 4 preserved');
  console.log('  ✅ PASS: Identifier format detection and privacy masking verified');

  // --- 2. Registration OTP Generation & Delivery ---
  console.log('\n--- 2. Registration OTP Generation & Rate-Limiting ---');
  const testEmail = `test.user.${Date.now()}@medshare.org`;
  const regPayload = {
    fullName: 'Test Unified Member',
    bloodGroup: 'B_POS',
    passwordHash: 'mock-hash-12345',
  };

  const otpResult1 = await otpService.createAndSendOtp({
    identifier: testEmail,
    type: 'REGISTRATION',
    payload: regPayload,
  });

  assert.strictEqual(otpResult1.success, true, 'OTP generated successfully');
  assert.strictEqual(otpResult1.destinationType, 'email', 'Destination type is email');
  assert.strictEqual(otpResult1.resendCooldown, 60, 'Resend cooldown is 60s');
  assert.ok(otpResult1.devCode && otpResult1.devCode.length === 6, 'Dev code generated with 6 digits');
  console.log('  ✅ PASS: 6-digit OTP generated and dispatched via email provider abstraction');

  // Test 60-second cooldown rate limit
  try {
    await otpService.createAndSendOtp({
      identifier: testEmail,
      type: 'REGISTRATION',
    });
    assert.fail('Should have rejected immediate resend');
  } catch (err: any) {
    assert.ok(err.message.includes('seconds'), 'Cooldown error message displayed');
    console.log('  ✅ PASS: 60-second resend cooldown strictly enforced');
  }

  // --- 3. OTP Verification Security & Attempts Limit ---
  console.log('\n--- 3. OTP Verification Security & Attempts Counter ---');
  // Attempt invalid code
  const invalidAttempt = await otpService.verifyOtp(testEmail, 'REGISTRATION', '000000');
  assert.strictEqual(invalidAttempt.valid, false, 'Invalid code rejected');
  assert.strictEqual(invalidAttempt.attemptsRemaining, 4, '4 attempts remaining after 1 failure');
  console.log('  ✅ PASS: Incorrect OTP code rejected and attempts tracked');

  // Verify with correct code
  const validAttempt = await otpService.verifyOtp(testEmail, 'REGISTRATION', otpResult1.devCode!);
  assert.strictEqual(validAttempt.valid, true, 'Correct code verified');
  assert.strictEqual(validAttempt.payload.fullName, 'Test Unified Member', 'Payload recovered accurately');
  console.log('  ✅ PASS: Valid OTP code verified and registration payload unlocked');

  // Re-verification of consumed OTP must fail
  const replayAttempt = await otpService.verifyOtp(testEmail, 'REGISTRATION', otpResult1.devCode!);
  assert.strictEqual(replayAttempt.valid, false, 'Consumed OTP cannot be replayed');
  console.log('  ✅ PASS: Single-use OTP replay prevention confirmed');

  // --- 4. Phone Registration & SMS Provider Abstraction ---
  console.log('\n--- 4. Phone Identifier & SMS Provider ---');
  const testPhone = `+1 (555) 901-${Math.floor(1000 + Math.random() * 9000)}`;
  const phoneOtpResult = await otpService.createAndSendOtp({
    identifier: testPhone,
    type: 'REGISTRATION',
    payload: { fullName: 'Phone User', bloodGroup: 'O_NEG' },
  });

  assert.strictEqual(phoneOtpResult.success, true, 'Phone OTP generated successfully');
  assert.strictEqual(phoneOtpResult.destinationType, 'phone', 'Destination type is phone');
  assert.ok(phoneOtpResult.devCode && phoneOtpResult.devCode.length === 6, 'Dev code generated');
  console.log('  ✅ PASS: SMS provider abstraction dispatches to phone identifier cleanly');

  // --- 5. Password Reset Flow ---
  console.log('\n--- 5. Password Reset OTP Flow ---');
  const resetUser = `reset.user.${Date.now()}@medshare.org`;
  const resetResult = await otpService.createAndSendOtp({
    identifier: resetUser,
    type: 'PASSWORD_RESET',
  });

  assert.strictEqual(resetResult.success, true, 'Password reset OTP generated');
  const resetVerify = await otpService.verifyOtp(resetUser, 'PASSWORD_RESET', resetResult.devCode!);
  assert.strictEqual(resetVerify.valid, true, 'Password reset code verified');
  console.log('  ✅ PASS: Complete password reset verification cycle verified');

  console.log('\n===================================================');
  console.log('🏁 SIMPLIFIED AUTH & OTP SUITE: ALL CHECKS PASSED');
  console.log('===================================================\n');
}

runSimplifiedAuthTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
