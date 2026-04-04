import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAgentic } from '@/lib/hooks/useAgentic';
import { AgentContext } from '@/lib/core/types';
import { formatDistanceToNow } from 'date-fns';

function AgentCard({ context, onPress }: { context: AgentContext; onPress: () => void }) {
  const statusColor = context.status === 'active' ? '#22c55e' : context.status === 'idle' ? '#eab308' : '#6b7280';
  const lastActive = context.lastActivity
    ? formatDistanceToNow(new Date(context.lastActivity), { addSuffix: true })
    : 'No activity';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
        <Text style={styles.cardName}>{context.name}</Text>
      </View>
      <Text style={styles.cardChannel}>{context.channel || 'web'}</Text>
      <Text style={styles.cardActivity}>{lastActive}</Text>
    </TouchableOpacity>
  );
}

export default function AgentListScreen() {
  const router = useRouter();
  const { contexts, loading, error, reload } = useAgentic();

  if (loading && contexts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load agents</Text>
        <TouchableOpacity onPress={reload} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Agents' }} />
      <FlatList
        data={contexts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AgentCard
            context={item}
            onPress={() => router.push(`/agent/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No agents found</Text>
          </View>
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  cardName: { fontSize: 16, fontWeight: '600', color: '#f8fafc', flex: 1 },
  cardChannel: { fontSize: 13, color: '#94a3b8', marginBottom: 2 },
  cardActivity: { fontSize: 12, color: '#64748b' },
  errorText: { color: '#f87171', fontSize: 16, marginBottom: 12 },
  retryButton: { backgroundColor: '#6366f1', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontWeight: '600' },
  emptyText: { color: '#64748b', fontSize: 16 },
});
