import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  CreditCard,
  CheckCircle2,
  IndianRupee,
  Clock,
  Zap,
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';

interface WalletTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  created_at: string;
}

interface WalletModalProps {
  visible: boolean;
  onClose: () => void;
  userId?: string | null;
  currentBalance: number;
  onBalanceUpdated: (newBalance: number) => void;
  theme?: 'light' | 'dark';
}

const QUICK_AMOUNTS = [100, 200, 500, 1000];

export function WalletModal({
  visible,
  onClose,
  userId,
  currentBalance,
  onBalanceUpdated,
  theme = 'light',
}: WalletModalProps) {
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const safeTop =
    Math.max(insets.top, Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24)) + 12;

  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [selectedAmount, setSelectedAmount] = useState<number>(500);
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setTransactions(data as WalletTransaction[]);
    } catch {}
  }, [userId]);

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', userId)
        .single();
      if (data?.wallet_balance != null) {
        onBalanceUpdated(Number(data.wallet_balance));
      }
    } catch {}
  }, [userId, onBalanceUpdated]);

  useEffect(() => {
    if (visible && userId) {
      setLoading(true);
      Promise.all([fetchTransactions(), fetchBalance()]).finally(() =>
        setLoading(false)
      );
    }
  }, [visible, userId]);

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchTransactions(), fetchBalance()]);
    setRefreshing(false);
  }

  async function handleAddMoney() {
    if (!userId) {
      Alert.alert('Sign In Required', 'Please sign in to use Orange Wallet.');
      return;
    }
    if (!upiId.trim()) {
      Alert.alert('UPI ID Required', 'Enter your UPI ID to add money.');
      return;
    }
    if (selectedAmount < 10) {
      Alert.alert('Minimum \u20b910', 'Please add at least \u20b910 to your wallet.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAdding(true);

    try {
      const newBalance = currentBalance + selectedAmount;

      // Insert credit transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: userId,
          amount: selectedAmount,
          type: 'credit',
          description: `Top-up via UPI (${upiId.trim()})`,
        });

      if (txError) throw txError;

      // Update profile balance
      await supabase
        .from('profiles')
        .upsert({ id: userId, wallet_balance: newBalance });

      onBalanceUpdated(newBalance);
      setSuccess(true);
      setUpiId('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await fetchTransactions();

      setTimeout(() => setSuccess(false), 2500);
    } catch (err: any) {
      Alert.alert('Top-Up Failed', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setAdding(false);
    }
  }

  function formatDate(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  const renderTransaction = ({ item }: { item: WalletTransaction }) => {
    const isCredit = item.type === 'credit';
    return (
      <View style={[styles.txRow, isDark && styles.txRowDark]}>
        <View style={[styles.txIcon, { backgroundColor: isCredit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)' }]}>
          {isCredit
            ? <TrendingUp size={16} color="#10B981" />
            : <TrendingDown size={16} color="#EF4444" />}
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.txDesc, isDark && styles.textWhite]} numberOfLines={1}>
            {item.description}
          </Text>
          <Text style={[styles.txDate, isDark && styles.textMuted]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.txAmount, { color: isCredit ? '#10B981' : '#EF4444' }]}>
          {isCredit ? '+' : '-'}\u20b9{item.amount}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.container, isDark && styles.containerDark]}>
        {/* HEADER */}
        <View style={[styles.header, { paddingTop: safeTop }, isDark && styles.headerDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={styles.headerIconWrap}>
              <Wallet size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Orange Wallet</Text>
              <Text style={[styles.headerSub, isDark && styles.textMuted]}>Secure · Instant · Zero Charges</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.closeBtn, isDark && styles.closeBtnDark]}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
          </TouchableOpacity>
        </View>

        {/* BALANCE CARD */}
        <View style={styles.balanceCardWrap}>
          <View style={[styles.balanceCard, isDark && styles.balanceCardDark]}>
            <Text style={styles.balanceLabel}>Available Balance</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 4 }}>
              <IndianRupee size={26} color="#FFFFFF" />
              <Text style={styles.balanceAmount}>{currentBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.balanceBadge}>
              <Zap size={10} color="#F97316" />
              <Text style={styles.balanceBadgeText}>Instant ride deductions</Text>
            </View>
          </View>
        </View>

        {/* ADD MONEY SECTION */}
        <View style={[styles.addSection, isDark && styles.addSectionDark]}>
          <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Add Money</Text>

          {/* Quick amount chips */}
          <View style={styles.amountRow}>
            {QUICK_AMOUNTS.map((amt) => (
              <TouchableOpacity
                key={amt}
                style={[
                  styles.amountChip,
                  selectedAmount === amt && styles.amountChipActive,
                  isDark && styles.amountChipDark,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedAmount(amt);
                }}
              >
                <Text
                  style={[
                    styles.amountChipText,
                    selectedAmount === amt && styles.amountChipTextActive,
                    isDark && selectedAmount !== amt && styles.textWhite,
                  ]}
                >
                  \u20b9{amt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* UPI Input + Add Button */}
          <View style={styles.upiRow}>
            <View style={[styles.upiInputWrap, isDark && styles.upiInputWrapDark]}>
              <CreditCard size={15} color="#94A3B8" style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.upiInput, isDark && styles.textWhite]}
                placeholder="Enter UPI ID (e.g. name@upi)"
                placeholderTextColor={isDark ? '#475569' : '#94A3B8'}
                value={upiId}
                onChangeText={setUpiId}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            <TouchableOpacity
              style={[styles.addBtn, (adding || success) && styles.addBtnDisabled]}
              onPress={handleAddMoney}
              disabled={adding || success}
              activeOpacity={0.85}
            >
              {adding ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : success ? (
                <CheckCircle2 size={18} color="#FFFFFF" />
              ) : (
                <>
                  <Plus size={15} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Add \u20b9{selectedAmount}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* TRANSACTION HISTORY */}
        <View style={[styles.historySection, isDark && styles.historySectionDark]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Clock size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text style={[styles.sectionTitle, isDark && styles.textWhite]}>Transaction History</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#F97316" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={transactions}
              keyExtractor={(t) => t.id}
              renderItem={renderTransaction}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F97316" />
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Wallet size={32} color={isDark ? '#334155' : '#CBD5E1'} />
                  <Text style={[styles.emptyText, isDark && styles.textMuted]}>
                    No transactions yet.{'\n'}Add money to get started!
                  </Text>
                </View>
              }
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  containerDark: { backgroundColor: '#0B0F19' },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  headerDark: { backgroundColor: '#111827', borderBottomColor: '#1F2937' },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', letterSpacing: -0.3 },
  headerSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center',
  },
  closeBtnDark: { backgroundColor: '#1F2937' },
  balanceCardWrap: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 4 },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      ios: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16 },
      android: { elevation: 10 },
    }),
  },
  balanceCardDark: { backgroundColor: '#1E293B' },
  balanceLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: 0.8 },
  balanceAmount: { fontSize: 44, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1.5 },
  balanceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(249,115,22,0.15)', alignSelf: 'flex-start',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, marginTop: 12,
  },
  balanceBadgeText: { fontSize: 10, fontWeight: '700', color: '#F97316' },
  addSection: {
    margin: 16, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  addSectionDark: { backgroundColor: '#111827', borderColor: '#1F2937' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A', textTransform: 'uppercase', letterSpacing: 0.5 },
  amountRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  amountChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  amountChipDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  amountChipActive: { backgroundColor: '#FFF7ED', borderColor: '#F97316' },
  amountChipText: { fontSize: 14, fontWeight: '700', color: '#64748B' },
  amountChipTextActive: { color: '#F97316' },
  upiRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  upiInputWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  upiInputWrapDark: { backgroundColor: '#1E293B', borderColor: '#334155' },
  upiInput: { flex: 1, fontSize: 13, color: '#0F172A', fontWeight: '500' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F97316', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  addBtnDisabled: { backgroundColor: '#10B981' },
  addBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  historySection: { flex: 1, marginHorizontal: 16, marginBottom: 16 },
  historySectionDark: {},
  txRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  txRowDark: { backgroundColor: '#111827', borderColor: '#1F2937' },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  txDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 20 },
  textWhite: { color: '#F1F5F9' },
  textMuted: { color: '#64748B' },
});
