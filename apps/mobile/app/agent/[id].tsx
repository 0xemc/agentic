import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { AgentMessage } from '@agentic/core/types';
import { APIAdapter } from '@agentic/core/adapters/api';
import { usePolling } from '@agentic/core/hooks';

const api = new APIAdapter();

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Load initial messages
  useEffect(() => {
    if (!id) return;
    api.getMessages(id).then(setMessages).catch(console.error);
    api.getContext(id).then((ctx) => {
      navigation.setOptions({ title: ctx.name });
    }).catch(console.error);
  }, [id, navigation]);

  // Add incoming messages without duplicates
  const addMessage = useCallback((msg: AgentMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === msg.id)) return prev;
      if (msg.sender === 'agent') setAgentTyping(false);
      return [...prev, msg];
    });
  }, []);

  // Real-time polling (replaces SSE / EventSource)
  usePolling({
    url: `/api/agents/${id}/messages`,
    enabled: !!id,
    intervalMs: 2000,
    onMessage: (data: unknown) => {
      const d = data as { type: string; message: AgentMessage };
      if (d.type === 'message') {
        addMessage({ ...d.message, timestamp: new Date(d.message.timestamp) });
      }
    },
  });

  // Scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const send = async () => {
    if (!input.trim() || !id || sending) return;
    const text = input.trim();
    setInput('');
    setSending(false);
    setAgentTyping(true);

    try {
      const msg = await api.sendMessage(id, text);
      if (msg) addMessage(msg);
    } catch (e) {
      console.error('Send failed:', e);
      setAgentTyping(false);
    }
  };

  const renderMessage = ({ item }: { item: AgentMessage }) => {
    const isUser = item.sender === 'user';
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userText : styles.agentText]}>
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        style={styles.messages}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesContent}
        ListFooterComponent={agentTyping ? (
          <View style={[styles.bubble, styles.agentBubble]}>
            <ActivityIndicator size="small" color="#94a3b8" />
          </View>
        ) : null}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message..."
          placeholderTextColor="#475569"
          multiline
          onSubmitEditing={send}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          <Text style={styles.sendBtnText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  messages: { flex: 1 },
  messagesContent: { padding: 16, gap: 8 },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  agentBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  agentText: { color: '#e2e8f0' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: 24,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#334155' },
  sendBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
