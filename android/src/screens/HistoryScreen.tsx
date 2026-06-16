import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import { api } from '../services/api';

interface HistoryPoint {
  ts: number;
  soc: number | null;
  power_kw: number | null;
  speed_mph: number | null;
}

const RANGES = [
  { label: '1h', seconds: 3600 },
  { label: '6h', seconds: 6 * 3600 },
  { label: '24h', seconds: 24 * 3600 },
  { label: '7d', seconds: 7 * 24 * 3600 },
];

export const HistoryScreen: React.FC = () => {
  const [rangeIndex, setRangeIndex] = useState(0);
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = Date.now() / 1000;
      const start = now - RANGES[rangeIndex].seconds;
      const resolution = Math.max(10, Math.floor(RANGES[rangeIndex].seconds / 200));
      const res = await api.getHistory(start, now, resolution);
      setData(res.data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [rangeIndex]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const socData = data
    .filter((p) => p.soc !== null)
    .map((p) => ({ x: p.ts, y: p.soc as number }));

  const powerData = data
    .filter((p) => p.power_kw !== null)
    .map((p) => ({ x: p.ts, y: p.power_kw as number }));

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.title}>History</Text>

      {/* Range selector */}
      <View style={styles.tabs}>
        {RANGES.map((r, i) => (
          <TouchableOpacity
            key={r.label}
            style={[styles.tab, i === rangeIndex && styles.tabActive]}
            onPress={() => setRangeIndex(i)}
          >
            <Text style={[styles.tabText, i === rangeIndex && styles.tabTextActive]}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator color="#4CAF50" style={{ marginTop: 40 }} />}
      {error && <Text style={styles.error}>{error}</Text>}

      {!loading && socData.length > 1 && (
        <View style={styles.chart}>
          <Text style={styles.chartTitle}>State of Charge (%)</Text>
          <VictoryChart theme={VictoryTheme.material} height={200} padding={{ left: 50, right: 20, top: 10, bottom: 40 }}>
            <VictoryAxis style={{ axis: { stroke: '#444' }, tickLabels: { fill: '#888', fontSize: 10 } }} />
            <VictoryAxis dependentAxis style={{ axis: { stroke: '#444' }, tickLabels: { fill: '#888', fontSize: 10 } }} />
            <VictoryLine data={socData} style={{ data: { stroke: '#4CAF50', strokeWidth: 2 } }} />
          </VictoryChart>
        </View>
      )}

      {!loading && powerData.length > 1 && (
        <View style={styles.chart}>
          <Text style={styles.chartTitle}>Power (kW)</Text>
          <VictoryChart theme={VictoryTheme.material} height={200} padding={{ left: 50, right: 20, top: 10, bottom: 40 }}>
            <VictoryAxis style={{ axis: { stroke: '#444' }, tickLabels: { fill: '#888', fontSize: 10 } }} />
            <VictoryAxis dependentAxis style={{ axis: { stroke: '#444' }, tickLabels: { fill: '#888', fontSize: 10 } }} />
            <VictoryLine data={powerData} style={{ data: { stroke: '#FF9800', strokeWidth: 2 } }} />
          </VictoryChart>
        </View>
      )}

      {!loading && data.length === 0 && !error && (
        <Text style={styles.empty}>No data for this period yet.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121212' },
  content: { paddingBottom: 40 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', padding: 20, paddingBottom: 10 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12 },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: '#4CAF50' },
  tabText: { color: '#666', fontWeight: '500' },
  tabTextActive: { color: '#4CAF50' },
  chart: { marginHorizontal: 8, marginBottom: 8 },
  chartTitle: { color: '#888', fontSize: 12, textTransform: 'uppercase', marginLeft: 12, marginBottom: 4 },
  error: { color: '#F44336', textAlign: 'center', marginTop: 20 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60 },
});
