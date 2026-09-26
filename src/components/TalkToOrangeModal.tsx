import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Send,
  Phone,
  MessageCircle,
  Shield,
  Sparkles,
  Car,
  ChevronRight,
  ArrowRight,
  RotateCcw,
  Briefcase,
  HelpCircle,
  MapPin,
  Bot,
  User,
  Clock,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react-native';
import { Booking } from '../types';

const { width } = Dimensions.get('window');

export interface ChatMessage {
  id: string;
  sender: 'user' | 'orange';
  text: string;
  timestamp: string;
  actionButton?: {
    label: string;
    actionType: 'book_airport' | 'book_custom' | 'call_concierge' | 'call_safety' | 'email_business';
    data?: any;
  };
}

interface TalkToOrangeModalProps {
  visible: boolean;
  onClose: () => void;
  onBookRide?: (destinationName?: string, coords?: { lat: number; lng: number }) => void;
  theme?: 'light' | 'dark';
  topInset?: number;
  activeBooking?: Booking | null;
  onOpenChauffeurChat?: () => void;
}

const QUICK_SUGGESTIONS = [
  '🚕 Fares & Pricing',
  '✈️ Airport pickup & baggage',
  '🛡️ Zero Cancellation policy',
  '⚡ Mahindra BE.6 amenities',
  '💼 Corporate accounts',
  '📍 Book ride to Airport',
  '🎒 Lost & Found support',
];

const INITIAL_GREETING: ChatMessage = {
  id: 'greet-1',
  sender: 'orange',
  text: "Namaste! I'm Orangee, your personal Orange Taxi Concierge. 🍊\n\nHow may I assist your journey today? Ask me anything about our 100% electric Mahindra BE.6 fleet, pricing, airport runs, or book a cab!",
  timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
};

// Intelligent domain matcher for instant response
function getConciergeResponse(input: string): { text: string; actionButton?: ChatMessage['actionButton'] } {
  const query = input.toLowerCase().trim();

  // Fares & Pricing
  if (
    query.includes('fare') ||
    query.includes('price') ||
    query.includes('cost') ||
    query.includes('rate') ||
    query.includes('charge') ||
    query.includes('how much') ||
    query.includes('pricing')
  ) {
    return {
      text:
        '🏷️ *Transparent Pricing Across Fleets:*\n\n' +
        '• *Orange Go:* ₹49 Base + ₹12/km (Min ₹99, 4 seats)\n' +
        '• *Orange Sedan:* ₹59 Base + ₹15/km (Min ₹129, 4 seats)\n' +
        '• *Orange XL:* ₹79 Base + ₹20/km (Min ₹179, 6-7 seats)\n\n' +
        '✅ Zero surge pricing on advance scheduled rides.\n' +
        '✅ 5% GST included with downloadable Tax Invoice.\n' +
        '✅ No hidden booking or cancellation penalties.',
      actionButton: {
        label: '📍 Select Ride & View Estimate',
        actionType: 'book_custom',
      },
    };
  }

  // Airport Pickup & Transfers
  if (
    query.includes('airport') ||
    query.includes('igi') ||
    query.includes('flight') ||
    query.includes('terminal') ||
    query.includes('t1') ||
    query.includes('t2') ||
    query.includes('t3') ||
    query.includes('kempegowda') ||
    query.includes('flight')
  ) {
    return {
      text:
        '✈️ *Orange Airport Concierge Service:*\n\n' +
        '• Dedicated pickup bays at Delhi IGI (T1, T2, T3) and Kempegowda Intl BLR.\n' +
        '• Chauffeur monitors your flight status for real-time flight delays.\n' +
        '• 45 minutes complimentary waiting time post landing.\n' +
        '• Chauffeur assists with heavy luggage right at the terminal pillar.',
      actionButton: {
        label: '✈️ Book Airport Transfer',
        actionType: 'book_airport',
        data: { name: 'IGI Airport Terminal 3, New Delhi', lat: 28.5562, lng: 77.1000 },
      },
    };
  }

  // Mahindra BE.6 & Fleet Amenities
  if (
    query.includes('fleet') ||
    query.includes('car') ||
    query.includes('be.6') ||
    query.includes('electric') ||
    query.includes('ev') ||
    query.includes('amenities') ||
    query.includes('screen') ||
    query.includes('wifi') ||
    query.includes('ac') ||
    query.includes('water')
  ) {
    return {
      text:
        '⚡ *100% Mahindra BE.6 Luxury Electric Fleet:*\n\n' +
        'Every Orange cab comes equipped with:\n' +
        '• In-seat rear HD displays for streaming movies & live GPS map.\n' +
        '• Studio acoustic surround sound with 1-tap Bluetooth pairing.\n' +
        '• Pre-cooled dual-zone AC at 22°C before you step in.\n' +
        '• Complimentary sealed Himalayan mineral water bottles.\n' +
        '• High-speed Type-C & Lightning fast chargers in rear armrest.\n' +
        '• Whisper-quiet EV acoustics & optional Quiet Ride mode.',
    };
  }

  // Zero Driver Cancellations
  if (
    query.includes('cancel') ||
    query.includes('refuse') ||
    query.includes('denial') ||
    query.includes('reject') ||
    query.includes('guarantee')
  ) {
    return {
      text:
        '🛡️ *Zero Cancellation Guarantee:*\n\n' +
        'Orange Taxi has a strict zero driver cancellation policy. Once a chauffeur accepts your ride, they cannot cancel.\n\n' +
        'If an unforeseen mechanical issue occurs, our Central Fleet Operations immediately auto-dispatches an alternate vehicle of equal or higher category without fare surge.',
    };
  }

  // Corporate & Business Accounts
  if (
    query.includes('corporate') ||
    query.includes('business') ||
    query.includes('company') ||
    query.includes('invoice') ||
    query.includes('gst') ||
    query.includes('billing')
  ) {
    return {
      text:
        '💼 *Orange for Business:*\n\n' +
        'We power executive commutes, airport client transfers, and late-night employee transport with:\n' +
        '• Centralized monthly billing & GST Input Tax Credit (ITC).\n' +
        '• Employee ride rosters & geo-fenced travel rules.\n' +
        '• Dedicated fleet account manager with SLA guarantees.\n\n' +
        'Would you like our enterprise team to contact you?',
      actionButton: {
        label: '📧 Email Corporate Desk',
        actionType: 'email_business',
      },
    };
  }

  // Lost & Found
  if (
    query.includes('lost') ||
    query.includes('found') ||
    query.includes('forgot') ||
    query.includes('item') ||
    query.includes('left') ||
    query.includes('wallet') ||
    query.includes('phone')
  ) {
    return {
      text:
        '🎒 *Lost & Found Assistance:*\n\n' +
        'Our chauffeurs conduct an immediate cabin check after every passenger drop.\n\n' +
        'If you left an item behind, please call our 24x7 Fleet Concierge immediately. Provide your ride reference or phone number, and we will coordinate vehicle return.',
      actionButton: {
        label: '📞 Call Fleet Control (+91 11 4000 7000)',
        actionType: 'call_concierge',
      },
    };
  }

  // Safety & SOS
  if (
    query.includes('safe') ||
    query.includes('emergency') ||
    query.includes('sos') ||
    query.includes('help') ||
    query.includes('police')
  ) {
    return {
      text:
        '🚨 *24x7 Safety & Emergency Desk:*\n\n' +
        'Your security is paramount. Every Orange cab features:\n' +
        '• Real-time GPS telematics with speed and route anomaly monitoring.\n' +
        '• Verified commercial chauffeurs with background verification.\n' +
        '• 1-tap live location sharing with Guardian contacts.\n' +
        '• Direct hotline to Orange Safety Ops and National Emergency 112.',
      actionButton: {
        label: '🚨 Call Emergency SOS (112)',
        actionType: 'call_safety',
      },
    };
  }

  // Direct Booking Intent
  if (
    query.includes('book') ||
    query.includes('ride') ||
    query.includes('cab') ||
    query.includes('taxi') ||
    query.includes('go to') ||
    query.includes('take me') ||
    query.includes('destination')
  ) {
    return {
      text:
        '🚕 *Ready to ride in luxury?*\n\n' +
        'Our Mahindra BE.6 fleet is stationed across the city with average chauffeur arrival times of 3–5 minutes.\n\n' +
        'Tap below to set your destination or schedule ahead!',
      actionButton: {
        label: '📍 Select Drop-off & Book Ride',
        actionType: 'book_custom',
      },
    };
  }

  // Default Fallback
  return {
    text:
      "I'm here to ensure your Orange Taxi experience is seamless! 🍊\n\n" +
      'You can ask me about:\n' +
      '• 🏷️ Transparent Fares & Vehicle Categories\n' +
      '• ✈️ Airport pickup & flight tracking\n' +
      '• ⚡ Mahindra BE.6 luxury amenities\n' +
      '• 🛡️ Zero driver cancellation policy\n' +
      '• 💼 Corporate monthly billing\n' +
      '• 🎒 Lost item retrieval\n\n' +
      'Or feel free to call our human concierge desk anytime!',
    actionButton: {
      label: '📞 Call 24x7 Concierge',
      actionType: 'call_concierge',
    },
  };
}

export function TalkToOrangeModal({
  visible,
  onClose,
  onBookRide,
  theme = 'light',
  topInset = 0,
  activeBooking,
  onOpenChauffeurChat,
}: TalkToOrangeModalProps) {
  const isDark = theme === 'dark';
  const insets = useSafeAreaInsets();
  const safeTopPadding = Math.max(insets.top, topInset, Platform.OS === 'ios' ? 54 : (StatusBar.currentHeight || 24)) + 12;

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [visible]);

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 50);

    // Generate intelligent AI response after short realistic typing pause
    setTimeout(() => {
      const reply = getConciergeResponse(text);
      const assistantMsg: ChatMessage = {
        id: `orange-${Date.now()}`,
        sender: 'orange',
        text: reply.text,
        timestamp: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        actionButton: reply.actionButton,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 60);
    }, 600);
  };

  const handleActionPress = (action: ChatMessage['actionButton']) => {
    if (!action) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    switch (action.actionType) {
      case 'book_airport':
        onClose();
        onBookRide?.(
          action.data?.name || 'IGI Airport Terminal 3, New Delhi',
          action.data || { lat: 28.5562, lng: 77.1000 }
        );
        break;
      case 'book_custom':
        onClose();
        onBookRide?.();
        break;
      case 'call_concierge':
        Linking.openURL('tel:+911140007000').catch(() => {
          Alert.alert('Call Failed', 'Please dial +91 11 4000 7000 manually.');
        });
        break;
      case 'call_safety':
        Linking.openURL('tel:112').catch(() => {
          Alert.alert('Call Failed', 'Please dial 112 manually.');
        });
        break;
      case 'email_business':
        Linking.openURL('mailto:business@orange-taxi.com?subject=Corporate%20Travel%20Enquiry%20-%20Orange%20Taxi');
        break;
    }
  };

  const handleResetChat = () => {
    Haptics.selectionAsync();
    setMessages([INITIAL_GREETING]);
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
        {/* TOP SAFE HEADER */}
        <View style={[styles.header, { paddingTop: safeTopPadding }, isDark && styles.headerDark]}>
          <View style={styles.headerTitleRow}>
            <View style={styles.brandIconWrap}>
              <Text style={styles.brandLetter}>O</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.headerTitle, isDark && styles.textWhite]}>Talk to Orange</Text>
                <View style={styles.onlineBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>24x7 Live</Text>
                </View>
              </View>
              <Text style={[styles.headerSubtitle, isDark && styles.textMutedDark]}>
                Chauffeur Concierge & Intelligent Assistant
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.resetBtn, isDark && styles.resetBtnDark]}
              onPress={handleResetChat}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <RotateCcw size={16} color={isDark ? '#94A3B8' : '#64748B'} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeBtn, isDark && styles.closeBtnDark]}
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={18} color={isDark ? '#F1F5F9' : '#0F172A'} />
            </TouchableOpacity>
          </View>

          {/* ACTIVE IN-RIDE BANNER (If rider is in transit with Chauffeur) */}
          {activeBooking && activeBooking.status !== 'completed' && activeBooking.status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.activeRideBanner, isDark && styles.activeRideBannerDark]}
              activeOpacity={0.85}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
                onOpenChauffeurChat?.();
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Car size={16} color="#F97316" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activeRideBannerTitle, isDark && styles.textWhite]}>
                    Trip In Progress ({activeBooking.reference || 'Ride'})
                  </Text>
                  <Text style={[styles.activeRideBannerSub, isDark && styles.textMutedDark]}>
                    Tap to chat directly with your assigned chauffeur
                  </Text>
                </View>
              </View>
              <ChevronRight size={16} color="#F97316" />
            </TouchableOpacity>
          )}

          {/* QUICK CONCIERGE CHANNELS STRIP */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickChannelsScroll}
            style={styles.quickChannelsContainer}
          >
            <TouchableOpacity
              style={[styles.channelChip, isDark && styles.channelChipDark]}
              onPress={() => Linking.openURL('tel:+911140007000')}
            >
              <Phone size={13} color="#F97316" />
              <Text style={[styles.channelChipText, isDark && styles.textWhite]}>Call Fleet Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, isDark && styles.channelChipDark]}
              onPress={() => {
                const url =
                  'https://wa.me/911140007000?text=' +
                  encodeURIComponent('Hi Orange Concierge, I need assistance with Orange Taxi.');
                Linking.openURL(url).catch(() => {
                  Alert.alert('WhatsApp Unavailable', 'Please call +91 11 4000 7000.');
                });
              }}
            >
              <MessageCircle size={13} color="#10B981" />
              <Text style={[styles.channelChipText, isDark && styles.textWhite]}>WhatsApp Desk</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, isDark && styles.channelChipDark]}
              onPress={() => Linking.openURL('tel:112')}
            >
              <Shield size={13} color="#EF4444" />
              <Text style={[styles.channelChipText, isDark && styles.textWhite]}>Safety SOS (112)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.channelChip, isDark && styles.channelChipDark]}
              onPress={() =>
                Linking.openURL('mailto:business@orange-taxi.com?subject=Corporate%20Enquiry%20-%20Orange%20Taxi')
              }
            >
              <Briefcase size={13} color="#3B82F6" />
              <Text style={[styles.channelChipText, isDark && styles.textWhite]}>Corporate Desk</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* CHAT MESSAGES BODY */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        >
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((item) => {
              const isUser = item.sender === 'user';
              return (
                <View
                  key={item.id}
                  style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowOrange]}
                >
                  {!isUser && (
                    <View style={styles.assistantAvatar}>
                      <Bot size={15} color="#FFFFFF" />
                    </View>
                  )}

                  <View
                    style={[
                      styles.messageBubble,
                      isUser ? styles.userBubble : styles.orangeBubble,
                      isDark && !isUser && styles.orangeBubbleDark,
                    ]}
                  >
                    {!isUser && (
                      <View style={styles.bubbleHeader}>
                        <Text style={styles.bubbleAuthor}>Orange Concierge</Text>
                        <Text style={[styles.bubbleTime, isDark && styles.textMutedDark]}>{item.timestamp}</Text>
                      </View>
                    )}

                    <Text
                      style={[
                        styles.messageText,
                        isUser ? styles.userMessageText : styles.orangeMessageText,
                        isDark && !isUser && styles.orangeMessageTextDark,
                      ]}
                    >
                      {item.text}
                    </Text>

                    {/* INTERACTIVE ACTION BUTTON INSIDE MESSAGE */}
                    {item.actionButton && (
                      <TouchableOpacity
                        style={styles.embeddedActionBtn}
                        activeOpacity={0.85}
                        onPress={() => handleActionPress(item.actionButton)}
                      >
                        <Text style={styles.embeddedActionText}>{item.actionButton.label}</Text>
                        <ArrowRight size={14} color="#FFFFFF" />
                      </TouchableOpacity>
                    )}

                    {isUser && <Text style={styles.userBubbleTime}>{item.timestamp}</Text>}
                  </View>
                </View>
              );
            })}

            {isTyping && (
              <View style={[styles.messageRow, styles.messageRowOrange]}>
                <View style={styles.assistantAvatar}>
                  <Bot size={15} color="#FFFFFF" />
                </View>
                <View style={[styles.typingBubble, isDark && styles.typingBubbleDark]}>
                  <ActivityIndicator size="small" color="#F97316" />
                  <Text style={[styles.typingText, isDark && styles.textMutedDark]}>
                    Orange Concierge is typing...
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* QUICK PROMPT SUGGESTIONS CAROUSEL */}
          <View style={[styles.suggestionsStrip, isDark && styles.suggestionsStripDark]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionsScroll}
            >
              {QUICK_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion}
                  style={[styles.suggestionChip, isDark && styles.suggestionChipDark]}
                  activeOpacity={0.7}
                  onPress={() => handleSendMessage(suggestion)}
                >
                  <Text style={[styles.suggestionChipText, isDark && styles.textWhite]}>{suggestion}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* CHAT INPUT BAR */}
          <View style={[styles.inputBar, isDark && styles.inputBarDark]}>
            <TextInput
              style={[styles.textInput, isDark && styles.textInputDark]}
              placeholder="Ask anything about fares, EV fleet, airport..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              value={inputText}
              onChangeText={setInputText}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleSendMessage()}
              editable={!isTyping}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || isTyping) && styles.sendBtnDisabled,
              ]}
              disabled={!inputText.trim() || isTyping}
              onPress={() => handleSendMessage()}
              activeOpacity={0.8}
            >
              <Send size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0B0F19',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingBottom: 10,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: { elevation: 2 },
    }),
  },
  headerDark: {
    backgroundColor: '#111827',
    borderBottomColor: '#1F2937',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLetter: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  onlineText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
  },
  resetBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  resetBtnDark: {
    backgroundColor: '#1F2937',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnDark: {
    backgroundColor: '#1F2937',
  },
  activeRideBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginTop: 10,
  },
  activeRideBannerDark: {
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  activeRideBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  activeRideBannerSub: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 1,
  },
  quickChannelsContainer: {
    marginTop: 10,
  },
  quickChannelsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 10,
  },
  channelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  channelChipDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  channelChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowOrange: {
    justifyContent: 'flex-start',
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: width * 0.78,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: '#F97316',
    borderBottomRightRadius: 4,
  },
  orangeBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: { elevation: 1 },
    }),
  },
  orangeBubbleDark: {
    backgroundColor: '#151C2C',
    borderColor: '#243046',
  },
  bubbleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  bubbleAuthor: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
  },
  bubbleTime: {
    fontSize: 9,
    fontWeight: '500',
    color: '#94A3B8',
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  orangeMessageText: {
    color: '#1E293B',
    fontWeight: '400',
  },
  orangeMessageTextDark: {
    color: '#F1F5F9',
  },
  userBubbleTime: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  embeddedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
    gap: 6,
  },
  embeddedActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  typingBubbleDark: {
    backgroundColor: '#151C2C',
    borderColor: '#243046',
  },
  typingText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
  },
  suggestionsStrip: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  suggestionsStripDark: {
    backgroundColor: '#111827',
    borderTopColor: '#1F2937',
  },
  suggestionsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suggestionChipDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  suggestionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  inputBarDark: {
    backgroundColor: '#111827',
    borderTopColor: '#1F2937',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 13,
    color: '#0F172A',
  },
  textInputDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
    color: '#F8FAFC',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#CBD5E1',
    opacity: 0.6,
  },
  textWhite: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
