import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { getBackendUrl, saveBackendUrl, api } from '../services/api';
import { tescanWS } from '../services/websocket';
import { useVehicleStore } from '../store/vehicleStore';

export const SettingsScreen: React.FC = () => {
  const { connectionStatus } = useVehicleStore();
  const [backendInput, setBackendInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getBackendUrl().then(setBackendInput);
  }, []);

  const saveAndReconnect = async () => {
    const trimmed = backendInput.trim();
    if (!trimmed) return;
    await saveBackendUrl(trimmed);
    tescanWS.disconnect();
    tescanWS.connect(trimmed);
    Alert.alert('Saved', 'Reconnecting to backend…');
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const res = await api.getHealth();
      Alert.alert(
        'Connected',
        `Mode: ${res.data.mode}\nFrames received: ${res.data.frames_received}`,
      );
    } catch (e: any) {
      Alert.alert('Connection Failed', e?.message ?? 'Could not reach backend');
    } finally {
      setTesting(false);
    }
  };

  const statusColor =
    connectionStatus === 'connected'
      ? '#4CAF50'
      : connectionStatus === 'connecting'
      ? '#FF9800'
      : '#F44336';

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Settings</Text>

      {/* Connection status */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>WebSocket Status</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
          </Text>
        </View>
      </View>

      {/* Backend URL */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Backend Address</Text>
        <Text style={styles.hint}>IP:PORT of the machine running the Python backend</Text>
        <TextInput
          style={styles.input}
          value={backendInput}
          onChangeText={setBackendInput}
          placeholder="192.168.4.2:8000"
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnSave} onPress={saveAndReconnect}>
            <Text style={styles.btnText}>Save & Reconnect</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnTest}
            onPress={testConnection}
            disabled={testing}
          >
            {testing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.btnText}>Test</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* Safety notice */}
      <View style={styles.warningCard}>
        <Text style={styles.warningTitle}>⚠ Chassis Bus</Text>
        <Text style={styles.warningText}>
          The chassis bus is strictly read-only. Writing to it can cause loss of
          vehicle control. Hardware and software protections enforce this — do not
          modify the ESP32 firmware or wiring to bypass them.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121212', padding: 16 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 20, marginTop: 4 },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  hint: { color: '#666', fontSize: 12, marginBottom: 10 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 14, fontWeight: '500' },
  input: {
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 14,
  },
  buttonRow: { flexDirection: 'row', gap: 10 },
  btnSave: {
    flex: 2,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  btnTest: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  warningCard: {
    backgroundColor: '#2a1a00',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 12,
    padding: 16,
  },
  warningTitle: { color: '#FF9800', fontWeight: '700', fontSize: 14, marginBottom: 8 },
  warningText: { color: '#cc8800', fontSize: 13, lineHeight: 20 },
});
