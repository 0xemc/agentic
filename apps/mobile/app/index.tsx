import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AgentContext } from '@agentic/core/types';
import { APIAdapter } from '@agentic/core/adapters/api';

const api = new APIAdapter();

export default function AgentListScreen() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await api.getContexts();
      setAgents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const statusColor = (status: string) => {
    if (status === 'active') return '#22c55e';
    if (status === 'idle') return '#f59e0b';
    return '#64748b';
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      data={agents}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#6366f1" />
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push(`/agent/${item.id}`)}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.dot, { backgroundColor: statusColor(item.status) }]} />
            <Text style={styles.name}>{item.name}</Text>
          </View>
          {item.lastMessage && (
            <Text style={styles.preview} numberOfLines={1}>
              {item.lastMessage.content}
            </Text>
          )}
          <Text style={styles.channel}>{item.channel ?? 'web'}</Text>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>No agents yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', flex: 1 },
  preview: { fontSize: 14, color: '#94a3b8', marginBottom: 4 },
  channel: { fontSize: 12, color: '#475569' },
  empty: { color: '#64748b', fontSize: 16 },
});
