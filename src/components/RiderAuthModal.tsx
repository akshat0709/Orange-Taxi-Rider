import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { X, ShieldCheck, ArrowRight, RotateCcw } from 'lucide-react-native';
import { useRideContext } from '../context/RideContext';

export function RiderAuthModal() {
  const {
    authModalVisible,
    setAuthModalVisible,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authFullName,
    setAuthFullName,
    authPhone,
    setAuthPhone,
    authOtp,
    setAuthOtp,
    authOtpResendCooldown,
    authOtpLockoutRemaining,
    handleVerifyOtp,
    handleResendOtp,
    authSubmitting,
    handleAuthSubmit,
    handleForgotPassword,
    theme,
  } = useRideContext();

  const isDark = theme === 'dark';

  return (
    <Modal visible={authModalVisible} animationType="slide" transparent={true}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBackdrop}
      >
        <View style={[styles.authModalContent, isDark && { backgroundColor: '#1E293B' }]}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.authModalHeader}>
              <Text style={[styles.authModalTitle, isDark && styles.textWhite]}>
                {authMode === 'verify_otp'
                  ? 'Verify Your Email'
                  : authMode === 'signin'
                  ? 'Sign In to Orange Taxi'
                  : 'Create Orange Account'}
              </Text>
              <TouchableOpacity
                onPress={() => setAuthModalVisible(false)}
                accessibilityLabel="Close auth dialog"
                accessibilityRole="button"
              >
                <X size={20} color={isDark ? '#94A3B8' : '#64748B'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.authModalSub, isDark && styles.textMutedDark]}>
              {authMode === 'verify_otp'
                ? `We sent a 4-digit code to ${authEmail || 'your email'}. Enter it below to complete registration.`
                : authMode === 'signin'
                ? 'Access your ride history, saved trips and instant booking.'
                : 'Join Orange Taxi for luxury electric travel across India.'}
            </Text>

            {/* Lockout Warning Banner */}
            {authMode === 'verify_otp' && authOtpLockoutRemaining > 0 && (
              <View style={styles.lockoutBanner}>
                <Text style={styles.lockoutText}>
                  Verification locked for 1 minute due to 5 unsuccessful attempts. Please wait {authOtpLockoutRemaining}s.
                </Text>
              </View>
            )}

            {authMode === 'verify_otp' ? (
              /* ================= OTP VERIFICATION MODE ================= */
              <View style={{ marginTop: 16 }}>
                <View style={styles.authField}>
                  <Text style={[styles.authLabel, isDark && styles.textMutedDark]}>
                    4-Digit Verification Code
                  </Text>
                  <TextInput
                    style={[
                      styles.authInput,
                      styles.otpInput,
                      isDark && styles.authInputDark,
                    ]}
                    placeholder="• • • •"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    keyboardType="number-pad"
                    maxLength={4}
                    value={authOtp}
                    onChangeText={(val) => setAuthOtp(val.replace(/[^0-9]/g, '').slice(0, 4))}
                    autoFocus
                  />
                </View>

                {/* Resend 30s Cooldown */}
                <View style={styles.resendRow}>
                  <Text style={[styles.resendHint, isDark && styles.textMutedDark]}>
                    Didn't receive the code?
                  </Text>
                  <TouchableOpacity
                    disabled={authOtpResendCooldown > 0 || authSubmitting}
                    onPress={handleResendOtp}
                  >
                    <Text
                      style={[
                        styles.resendBtnText,
                        authOtpResendCooldown > 0 && { opacity: 0.5 },
                      ]}
                    >
                      {authOtpResendCooldown > 0
                        ? `Resend Code (${authOtpResendCooldown}s)`
                        : 'Resend Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Verify Button */}
                <TouchableOpacity
                  style={[
                    styles.authSubmitBtn,
                    (authSubmitting || authOtp.length !== 4 || authOtpLockoutRemaining > 0) && {
                      opacity: 0.6,
                    },
                  ]}
                  disabled={authSubmitting || authOtp.length !== 4 || authOtpLockoutRemaining > 0}
                  onPress={handleVerifyOtp}
                >
                  {authSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : authOtpLockoutRemaining > 0 ? (
                    <Text style={styles.authSubmitText}>
                      Locked ({authOtpLockoutRemaining}s)
                    </Text>
                  ) : (
                    <Text style={styles.authSubmitText}>Verify & Continue</Text>
                  )}
                </TouchableOpacity>

                {/* Switch back to sign up */}
                <TouchableOpacity
                  style={{ alignItems: 'center', marginTop: 18 }}
                  onPress={() => setAuthMode('signup')}
                >
                  <Text style={[styles.switchLinkText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                    ← Incorrect email? Back to Sign Up
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              /* ================= SIGN IN / SIGN UP MODE ================= */
              <>
                {authMode === 'signup' && (
                  <>
                    <View style={styles.authField}>
                      <Text style={[styles.authLabel, isDark && styles.textMutedDark]}>Full Name</Text>
                      <TextInput
                        style={[styles.authInput, isDark && styles.authInputDark]}
                        placeholder="e.g. Akshat Gupta"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        value={authFullName}
                        onChangeText={setAuthFullName}
                      />
                    </View>
                    <View style={styles.authField}>
                      <Text style={[styles.authLabel, isDark && styles.textMutedDark]}>Phone Number</Text>
                      <TextInput
                        style={[styles.authInput, isDark && styles.authInputDark]}
                        placeholder="e.g. +91 98765 43210"
                        placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                        keyboardType="phone-pad"
                        value={authPhone}
                        onChangeText={setAuthPhone}
                      />
                    </View>
                  </>
                )}

                <View style={styles.authField}>
                  <Text style={[styles.authLabel, isDark && styles.textMutedDark]}>Email Address</Text>
                  <TextInput
                    style={[styles.authInput, isDark && styles.authInputDark]}
                    placeholder="name@domain.com"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={authEmail}
                    onChangeText={setAuthEmail}
                  />
                </View>

                <View style={styles.authField}>
                  <Text style={[styles.authLabel, isDark && styles.textMutedDark]}>Password</Text>
                  <TextInput
                    style={[styles.authInput, isDark && styles.authInputDark]}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
                    secureTextEntry
                    value={authPassword}
                    onChangeText={setAuthPassword}
                  />
                </View>

                <TouchableOpacity
                  style={styles.authSubmitBtn}
                  disabled={authSubmitting}
                  onPress={handleAuthSubmit}
                >
                  {authSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.authSubmitText}>
                      {authMode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                  )}
                </TouchableOpacity>

                {authMode === 'signin' && (
                  <TouchableOpacity
                    style={{ alignItems: 'center', marginTop: 15 }}
                    onPress={handleForgotPassword}
                  >
                    <Text style={{ color: '#F97316', fontSize: 14, fontWeight: '600' }}>
                      Forgot Password?
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.authSwitchBtn}
                  onPress={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                >
                  <Text style={[styles.authSwitchText, isDark && styles.textMutedDark]}>
                    {authMode === 'signin'
                      ? "Don't have an account? Sign Up"
                      : 'Already have an account? Sign In'}
                  </Text>
                </TouchableOpacity>

                <View style={{ marginTop: 16, marginBottom: 8, paddingHorizontal: 4 }}>
                  <Text
                    style={{
                      fontSize: 11,
                      color: isDark ? '#94A3B8' : '#64748B',
                      textAlign: 'center',
                      lineHeight: 16,
                    }}
                  >
                    By continuing, you agree to Orange Taxi&apos;s{' '}
                    <Text
                      style={{ color: '#F97316', fontWeight: '600', textDecorationLine: 'underline' }}
                      onPress={() => Linking.openURL('https://orange-taxi.com/privacy')}
                    >
                      Privacy Policy
                    </Text>{' '}
                    and{' '}
                    <Text
                      style={{ color: '#F97316', fontWeight: '600', textDecorationLine: 'underline' }}
                      onPress={() => Linking.openURL('https://orange-taxi.com/terms')}
                    >
                      Terms of Service
                    </Text>
                    .
                  </Text>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  authModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    maxHeight: '90%',
  },
  authModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  authModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  authModalSub: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  authField: {
    marginBottom: 14,
  },
  authLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  authInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  authInputDark: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    color: '#FFFFFF',
  },
  otpInput: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 12,
    textAlign: 'center',
    paddingVertical: 14,
  },
  lockoutBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  lockoutText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  resendHint: {
    fontSize: 13,
    color: '#64748B',
  },
  resendBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F97316',
  },
  switchLinkText: {
    fontSize: 13,
    fontWeight: '600',
  },
  authSubmitBtn: {
    backgroundColor: '#F97316',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  authSubmitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  authSwitchBtn: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 6,
  },
  authSwitchText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
