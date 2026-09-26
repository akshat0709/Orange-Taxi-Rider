import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  Alert,
  Share,
  Platform,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  X,
  FileText,
  Mail,
  Share2,
  CheckCircle2,
  Car,
  MapPin,
  Calendar,
  CreditCard,
  Building2,
  ShieldCheck,
  Send,
  Copy,
  Sparkles,
} from 'lucide-react-native';
import { Booking } from '../types';

interface TaxInvoiceModalProps {
  visible: boolean;
  onClose: () => void;
  trip: Booking | null;
  user: any;
  theme?: 'light' | 'dark';
}

const { width } = Dimensions.get('window');

export function TaxInvoiceModal({
  visible,
  onClose,
  trip,
  user,
  theme = 'light',
}: TaxInvoiceModalProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visible && trip) {
      // Default to logged-in user email or empty
      const defaultEmail = user?.email || user?.user_metadata?.email || '';
      setRecipientEmail(defaultEmail);
      setCopied(false);
      setIsSending(false);
    }
  }, [visible, trip, user]);

  if (!trip) return null;
  const currentTrip = trip;

  const fare = currentTrip.estimated_fare || 149;
  // Indian GST for passenger transport by cab is 5% (inclusive in fare)
  // Taxable Value = fare / 1.05
  const taxableValue = Math.round((fare / 1.05) * 100) / 100;
  const totalGst = Math.round((fare - taxableValue) * 100) / 100;
  const cgst = Math.round((totalGst / 2) * 100) / 100;
  const sgst = Math.round((totalGst - cgst) * 100) / 100;

  // Breakdown of taxable value
  const baseCharge = Math.round(taxableValue * 0.65 * 100) / 100;
  const distanceCharge = Math.round((taxableValue - baseCharge) * 100) / 100;

  const invoiceNumber = `INV-OT-${currentTrip.reference || currentTrip.id.substring(0, 8).toUpperCase()}`;
  const formattedDate = formatInvoiceDate(currentTrip.created_at);
  const riderName =
    user?.user_metadata?.full_name ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'Executive Passenger';
  const riderPhone =
    user?.phone || user?.user_metadata?.phone || '+91 98765 43210';
  const pickupLoc = currentTrip.pickup_address || currentTrip.pickup_area || 'Bangalore City';
  const dropLoc = currentTrip.drop_address || currentTrip.drop_area || 'Kempegowda Int. Airport (BLR)';
  const vehicleName = currentTrip.vehicle_name || 'Mahindra BE.6 Executive EV';
  const vehicleNumber = currentTrip.vehicle_number || 'KA 01 EK 2026';
  const paymentMethod = currentTrip.payment_method?.toUpperCase() || 'UPI / ONLINE';

  function formatInvoiceDate(isoString: string) {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  }

  function generateInvoicePlainText(): string {
    return [
      `==================================================`,
      `          ORANGE TAXI LIMITED - TAX INVOICE       `,
      `  (Issued under Rule 46 of the CGST Rules, 2017)  `,
      `==================================================`,
      `CIN: U49224DL2026PLC461350`,
      `GSTIN: 29AABCO1234F1Z5  |  SAC: 9966 (Passenger Transport)`,
      `Registered Office: Cyber Park, Electronic City, Bengaluru 560100`,
      `Support: 1800-200-ORANGE  |  support@orangetaxi.in`,
      `--------------------------------------------------`,
      `INVOICE DETAILS`,
      `Invoice No: ${invoiceNumber}`,
      `Invoice Date: ${formattedDate}`,
      `Booking ID: ${currentTrip.reference || currentTrip.id}`,
      `State of Supply: Karnataka (Code: 29)`,
      `Status: PAID IN FULL`,
      `--------------------------------------------------`,
      `BILLED TO (CUSTOMER)`,
      `Name: ${riderName}`,
      `Email: ${recipientEmail || user?.email || 'N/A'}`,
      `Phone: ${riderPhone}`,
      `--------------------------------------------------`,
      `JOURNEY DETAILS`,
      `Vehicle: ${vehicleName} (${vehicleNumber})`,
      `Pickup: ${pickupLoc}`,
      `Destination: ${dropLoc}`,
      `Distance: ${currentTrip.distance_km || 12} km`,
      `--------------------------------------------------`,
      `ITEMIZED BILLING (INR)`,
      `1. Base & Chauffeur Charges:        ₹${baseCharge.toFixed(2)}`,
      `2. Distance & Electric Propulsion:  ₹${distanceCharge.toFixed(2)}`,
      `--------------------------------------------------`,
      `Taxable Value:                     ₹${taxableValue.toFixed(2)}`,
      `CGST @ 2.5%:                       ₹${cgst.toFixed(2)}`,
      `SGST @ 2.5%:                       ₹${sgst.toFixed(2)}`,
      `Total GST (5%):                    ₹${totalGst.toFixed(2)}`,
      `--------------------------------------------------`,
      `TOTAL AMOUNT PAID:                 ₹${fare.toFixed(2)}`,
      `Payment Mode:                      ${paymentMethod}`,
      `--------------------------------------------------`,
      `SPECIAL ASSURANCES:`,
      `* Zero Cancellation Guarantee Applied (No cancellation penalty)`,
      `* 100% Zero-Emission Executive Electric Mobility`,
      `* This is a computer-generated tax invoice and requires no physical signature.`,
      `==================================================`,
    ].join('\n');
  }

  async function handleSendEmail() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const emailToSend = recipientEmail.trim();
    if (emailToSend && !/^\S+@\S+\.\S+$/.test(emailToSend)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to receive the tax invoice.');
      return;
    }

    setIsSending(true);

    const subject = encodeURIComponent(
      `Tax Invoice ${invoiceNumber} · Orange Taxi Trip (₹${fare})`
    );
    const invoiceBody = generateInvoicePlainText();
    const body = encodeURIComponent(
      `Dear ${riderName},\n\n` +
      `Thank you for riding with Orange Taxi. Please find below your official Tax Invoice for booking reference ${currentTrip.reference || currentTrip.id}.\n\n` +
      `${invoiceBody}\n\n` +
      `For any corporate billing or GST reconciliation queries, write to accounts@orangetaxi.in.\n\n` +
      `Warm regards,\n` +
      `Billing & Finance Team\n` +
      `Orange Taxi Limited`
    );

    const mailtoUrl = emailToSend
      ? `mailto:${emailToSend}?subject=${subject}&body=${body}`
      : `mailto:?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Fallback to sharing if mail client scheme isn't directly registered
        await Share.share({
          title: `Tax Invoice ${invoiceNumber}`,
          message: invoiceBody,
        });
      }
    } catch (err) {
      console.warn('Mail dispatch error:', err);
      // Fallback to share
      await Share.share({
        title: `Tax Invoice ${invoiceNumber}`,
        message: invoiceBody,
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleShareInvoice() {
    Haptics.selectionAsync();
    const invoiceBody = generateInvoicePlainText();
    try {
      await Share.share({
        title: `Tax Invoice ${invoiceNumber}`,
        message: invoiceBody,
      });
    } catch (err) {
      console.warn('Share error:', err);
    }
  }

  if (!visible) return null;

  return (
    <View style={styles.fullscreenContainer}>
      <View style={styles.modalOverlay}>
        <View style={styles.sheetCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIconWrap}>
                <FileText size={20} color="#EA580C" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Official Tax Invoice</Text>
                <Text style={styles.headerSubTitle}>
                  Rule 46 CGST · GSTIN 29AABCO1234F1Z5
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerShareBtn}
                onPress={handleShareInvoice}
                accessibilityLabel="Share Invoice"
              >
                <Share2 size={18} color="#475569" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  onClose();
                }}
                accessibilityLabel="Close"
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Paper Invoice Container */}
            <View style={styles.invoicePaper}>
              {/* Perforation / Decorative top accent */}
              <View style={styles.paperTopBar} />

              {/* Company Branding & Tax Badges */}
              <View style={styles.companyRow}>
                <View>
                  <View style={styles.brandRow}>
                    <Text style={styles.brandName}>ORANGE</Text>
                    <Text style={styles.brandTaxi}>TAXI</Text>
                    <View style={styles.officialBadge}>
                      <Text style={styles.officialBadgeText}>TAX INVOICE</Text>
                    </View>
                  </View>
                  <Text style={styles.legalEntityText}>
                    Orange Taxi Limited (CIN: U49224DL2026PLC461350)
                  </Text>
                  <Text style={styles.gstText}>
                    GSTIN: <Text style={styles.boldText}>29AABCO1234F1Z5</Text> · SAC: 9966
                  </Text>
                </View>

                <View style={styles.paidStamp}>
                  <CheckCircle2 size={14} color="#059669" />
                  <Text style={styles.paidStampText}>PAID</Text>
                </View>
              </View>

              {/* Invoice Meta Grid */}
              <View style={styles.metaGrid}>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>INVOICE NO.</Text>
                  <Text style={styles.metaValueMono}>{invoiceNumber}</Text>
                </View>
                <View style={styles.metaCol}>
                  <Text style={styles.metaLabel}>INVOICE DATE</Text>
                  <Text style={styles.metaValue}>{formattedDate}</Text>
                </View>
              </View>

              {/* Customer & Route Details */}
              <View style={styles.sectionDivider} />

              <View style={styles.customerRow}>
                <View style={styles.customerCol}>
                  <Text style={styles.sectionHeading}>BILLED TO</Text>
                  <Text style={styles.customerName}>{riderName}</Text>
                  <Text style={styles.customerMeta}>{riderPhone}</Text>
                  <Text style={styles.customerMeta}>State: Karnataka (29)</Text>
                </View>
                <View style={styles.customerColRight}>
                  <Text style={styles.sectionHeading}>VEHICLE & FLEET</Text>
                  <Text style={styles.vehicleName}>{vehicleName}</Text>
                  <Text style={styles.vehicleReg}>{vehicleNumber}</Text>
                  <Text style={styles.customerMeta}>100% Electric EV</Text>
                </View>
              </View>

              {/* Route Summary */}
              <View style={styles.routeBox}>
                <View style={styles.routeItem}>
                  <View style={styles.pickupDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routePointLabel}>PICKUP</Text>
                    <Text style={styles.routePointText} numberOfLines={2}>
                      {pickupLoc}
                    </Text>
                  </View>
                </View>

                <View style={styles.routeDottedLine} />

                <View style={styles.routeItem}>
                  <View style={styles.dropDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routePointLabel}>DESTINATION</Text>
                    <Text style={styles.routePointText} numberOfLines={2}>
                      {dropLoc}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Itemized Table */}
              <View style={styles.sectionDivider} />

              <Text style={styles.sectionHeading}>ITEMIZED TAX INVOICE BREAKDOWN</Text>

              <View style={styles.lineItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemTitle}>Base Fare & Chauffeur Charges</Text>
                  <Text style={styles.lineItemSub}>Minimum statutory service fare</Text>
                </View>
                <Text style={styles.lineItemAmount}>₹{baseCharge.toFixed(2)}</Text>
              </View>

              <View style={styles.lineItemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lineItemTitle}>
                    Distance Fare ({trip.distance_km || 12} km)
                  </Text>
                  <Text style={styles.lineItemSub}>Zero surge EV propulsion charge</Text>
                </View>
                <Text style={styles.lineItemAmount}>₹{distanceCharge.toFixed(2)}</Text>
              </View>

              <View style={styles.innerDottedLine} />

              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Net Taxable Subtotal</Text>
                <Text style={styles.subtotalAmount}>₹{taxableValue.toFixed(2)}</Text>
              </View>

              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>CGST @ 2.5% (Central Tax)</Text>
                <Text style={styles.taxAmount}>₹{cgst.toFixed(2)}</Text>
              </View>

              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>SGST @ 2.5% (State Tax Karnataka)</Text>
                <Text style={styles.taxAmount}>₹{sgst.toFixed(2)}</Text>
              </View>

              {/* Total Row */}
              <View style={styles.totalCard}>
                <View>
                  <Text style={styles.totalLabel}>TOTAL INVOICE AMOUNT</Text>
                  <Text style={styles.totalSub}>
                    Paid via {paymentMethod} · Zero Cancellation Guarantee
                  </Text>
                </View>
                <Text style={styles.totalAmount}>₹{fare.toFixed(2)}</Text>
              </View>

              {/* Statutory Note */}
              <View style={styles.statutoryBox}>
                <ShieldCheck size={16} color="#059669" />
                <Text style={styles.statutoryText}>
                  Valid Tax Invoice issued under Section 31 of CGST Act, 2017. Input Tax Credit (ITC) applicable for business registered entities under SAC 9966.
                </Text>
              </View>
            </View>

            {/* Email Dispatch Card */}
            <View style={styles.emailCard}>
              <View style={styles.emailHeaderRow}>
                <View style={styles.emailIconWrap}>
                  <Mail size={18} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.emailCardTitle}>Email Tax Invoice</Text>
                  <Text style={styles.emailCardSub}>
                    Receive this official invoice directly in your inbox or corporate accounts desk.
                  </Text>
                </View>
              </View>

              <View style={styles.emailInputWrapper}>
                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter email (e.g. name@company.com)"
                  placeholderTextColor="#94A3B8"
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={[styles.sendEmailBtn, isSending && { opacity: 0.7 }]}
                  onPress={handleSendEmail}
                  disabled={isSending}
                >
                  <Send size={15} color="#FFFFFF" />
                  <Text style={styles.sendEmailBtnText}>
                    {isSending ? 'Sending...' : 'Email Invoice'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickShareRow}>
                <TouchableOpacity
                  style={styles.quickShareBtn}
                  onPress={handleShareInvoice}
                >
                  <Share2 size={14} color="#64748B" />
                  <Text style={styles.quickShareText}>Share via WhatsApp / Notes</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    ...(StyleSheet.absoluteFill as any),
    zIndex: 99999,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '94%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubTitle: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerShareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoicePaper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  paperTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#F97316',
  },
  companyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 6,
    marginBottom: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#EA580C',
    letterSpacing: -0.5,
  },
  brandTaxi: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  officialBadge: {
    marginLeft: 8,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  officialBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  legalEntityText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 4,
  },
  gstText: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  boldText: {
    fontWeight: '700',
    color: '#0F172A',
  },
  paidStamp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  paidStampText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValueMono: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  customerCol: {
    flex: 1,
    paddingRight: 8,
  },
  customerColRight: {
    flex: 1,
    paddingLeft: 8,
    alignItems: 'flex-end',
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  customerMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  vehicleName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  vehicleReg: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginTop: 1,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickupDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  dropDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#F97316',
  },
  routeDottedLine: {
    width: 2,
    height: 14,
    backgroundColor: '#CBD5E1',
    marginLeft: 3,
    marginVertical: 2,
  },
  routePointLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  routePointText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  lineItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  lineItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  lineItemSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  lineItemAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  innerDottedLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  subtotalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  subtotalAmount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  taxLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  taxAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 14,
    padding: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  totalSub: {
    fontSize: 10,
    color: '#9A3412',
    fontWeight: '500',
    marginTop: 2,
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#EA580C',
  },
  statutoryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  statutoryText: {
    flex: 1,
    fontSize: 10,
    color: '#166534',
    lineHeight: 14,
    fontWeight: '500',
  },
  emailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  emailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  emailIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  emailCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    lineHeight: 15,
  },
  emailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  sendEmailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EA580C',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  sendEmailBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  quickShareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  quickShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  quickShareText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
});
