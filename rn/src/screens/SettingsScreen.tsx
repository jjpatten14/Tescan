import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { Panel } from '../components/Panel';
import { useVehicleStore } from '../store/vehicleStore';
import { T, DISP, MONO } from '../theme';

export function SettingsScreen() {
  const { status, settings, setDeviceName, setUnitsMph, startBle, stopBle } = useVehicleStore();
  const [nameInput, setNameInput] = useState(settings.deviceName);

  const statusColor = status === 'connected' ? T.green :
                      status === 'connecting' ? T.amber : T.lo;
  const statusLabel = status === 'connected' ? 'Connected' :
                      status === 'connecting' ? 'Scanning…' : 'Disconnected';

  function saveAndReconnect() {
    setDeviceName(nameInput.trim() || 'TESCAN');
    stopBle();
    setTimeout(startBle, 300);
  }

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {/* Status row */}
      <View style={s.statusRow}>
        <View style={[s.dot, { backgroundColor: statusColor, shadowColor: statusColor }]} />
        <Text style={[s.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
      </View>

      {/* BLE device */}
      <Panel style={s.section}>
        <Text style={s.sectionTitle}>BLE DEVICE</Text>
        <Text style={s.hint}>Must match the name advertised by the ESP32 (default: TESCAN)</Text>
        <TextInput
          style={s.input}
          value={nameInput}
          onChangeText={setNameInput}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="TESCAN"
          placeholderTextColor={T.lo}
        />
        <View style={s.btnRow}>
          <Pressable onPress={saveAndReconnect}
            style={({ pressed }) => [s.btn, s.btnPrimary, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[s.btnTxt, { color: T.ink }]}>Save & Reconnect</Text>
          </Pressable>
          <Pressable onPress={stopBle}
            style={({ pressed }) => [s.btn, s.btnSecondary, { opacity: pressed ? 0.85 : 1 }]}>
            <Text style={[s.btnTxt, { color: T.mid }]}>Disconnect</Text>
          </Pressable>
        </View>
      </Panel>

      {/* Units */}
      <Panel style={s.section}>
        <Text style={s.sectionTitle}>UNITS</Text>
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Miles (mph)</Text>
          <Switch
            value={settings.unitsMph}
            onValueChange={setUnitsMph}
            trackColor={{ false: T.border, true: T.cyan + '88' }}
            thumbColor={settings.unitsMph ? T.cyan : T.lo}
          />
        </View>
      </Panel>

      {/* Info */}
      <Panel style={s.section}>
        <Text style={s.sectionTitle}>ABOUT</Text>
        <Text style={s.infoLine}>Tescan — local Tesla CAN monitor</Text>
        <Text style={s.infoLine}>2018 Model 3 · Vehicle bus only</Text>
        <Text style={s.infoLine}>BLE NUS · Nordic UART Service</Text>
        <Text style={[s.infoLine, { color: T.amber, marginTop: 8 }]}>
          Chassis bus: deferred — satellite ESP32
        </Text>
      </Panel>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24, gap: 16 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
  },
  statusTxt: { fontFamily: DISP, fontSize: 13 },
  section: { padding: 20, gap: 12 },
  sectionTitle: {
    fontFamily: DISP,
    fontSize: 11,
    letterSpacing: 2,
    color: T.lo,
  },
  hint: { fontFamily: DISP, fontSize: 12, color: T.lo },
  input: {
    fontFamily: MONO,
    fontSize: 15,
    color: T.hi,
    borderWidth: 1,
    borderColor: T.borderHi,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: T.ink,
  },
  btnRow: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: { backgroundColor: T.cyan },
  btnSecondary: { backgroundColor: T.panel, borderWidth: 1, borderColor: T.border },
  btnTxt: { fontFamily: DISP, fontWeight: '600', fontSize: 14 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchLabel: { fontFamily: DISP, fontSize: 14, color: T.hi },
  infoLine: { fontFamily: MONO, fontSize: 12, color: T.mid },
});
