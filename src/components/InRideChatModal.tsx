import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send, MessageSquare, Phone, Car, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  sender: 'driver' | 'customer';
  senderName: string;
  text: string;
  timestamp: string;
}

interface InRideChatModalProps {
  visible: boolean;
  onClose: () => void;
  bookingId: string;
  customerName: string;
  driverName: string;
  driverPhone?: string;
}

const QUICK_CHIPS = [
  '🚶 On my way down right now',
  '🚪 Waiting at the security / reception gate',
  '❄️ Please turn on the AC',
  '⏱️ Please give me 2 minutes, arriving!',
];

export function InRideChatModal({
  visible,
  onClose,
  bookingId,
  customerName,
  driverName,
  driverPhone,
}: InRideChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!bookingId || !visible) return;

    // Connect to the exact same broadcast channel as the web driver console
    const channel = supabase.channel(`ride-chat-${bookingId}`, {
      config: { broadcast: { self: false, ack: true } },
    });

    channel
      .on('broadcast', { event: 'chat_message' }, (payload) => {
        if (payload?.payload) {
          const msg = payload.payload as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [bookingId, visible]);

  function handleSend(textToSend?: string) {
    const text = (textToSend || inputText).trim();
    if (!text) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      sender: 'customer',
      senderName: customerName || 'Passenger',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // Broadcast message over Supabase WebSocket to Driver Console
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'chat_message',
        payload: newMsg,
      }).catch((e: any) => console.warn('Broadcast send error:', e));
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={styles.driverAvatar}>
                <Car size={16} color="#F56B00" />
              </View>
              <View>
                <Text style={styles.driverName}>{driverName || 'Orange Chauffeur'}</Text>
                <Text style={styles.headerSub}>Live In-Ride Messaging</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          {/* Messages Area */}
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={{ paddingVertical: 12 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.length === 0 ? (
              <View style={styles.emptyState}>
                <MessageSquare size={32} color="#374151" />
                <Text style={styles.emptyTitle}>Chat with your Chauffeur</Text>
                <Text style={styles.emptySub}>Send a message or tap a quick chip below</Text>
              </View>
            ) : (
              messages.map((m) => {
                const isMe = m.sender === 'customer';
                return (
                  <View
                    key={m.id}
                    style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowOther]}
                  >
                    <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                      <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextOther]}>
                        {m.text}
                      </Text>
                      <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeOther]}>
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Quick Reply Chips */}
          <View style={styles.chipsContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {QUICK_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.chip}
                  onPress={() => handleSend(chip)}
                >
                  <Text style={styles.chipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Input Bar */}
          <View style={styles.inputBar}>
            <TextInput
              style={styles.input}
              placeholder="Type message to driver..."
              placeholderTextColor="#6B7280"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              disabled={!inputText.trim()}
              onPress={() => handleSend()}
            >
              <Send size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#141820',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '75%',
    borderTopWidth: 1,
    borderTopColor: '#232936',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2430',
  },
  driverAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0F1218',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F56B00',
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  headerSub: {
    color: '#22C55E',
    fontSize: 11,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 4,
  },
  messageRow: {
    marginVertical: 4,
    flexDirection: 'row',
  },
  messageRowMe: {
    justifyContent: 'flex-end',
  },
  messageRowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleMe: {
    backgroundColor: '#F56B00',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1E2430',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 19,
  },
  bubbleTextMe: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bubbleTextOther: {
    color: '#E5E7EB',
  },
  bubbleTime: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bubbleTimeOther: {
    color: '#9CA3AF',
  },
  chipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
  },
  chip: {
    backgroundColor: '#0F1218',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#232936',
  },
  chipText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '500',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0F1218',
    borderTopWidth: 1,
    borderTopColor: '#1F2430',
  },
  input: {
    flex: 1,
    backgroundColor: '#141820',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#232936',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F56B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#2D3748',
    opacity: 0.5,
  },
});
