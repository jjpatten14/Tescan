import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useVehicleStore } from '../store/vehicleStore';
import { BatteryGauge } from '../components/BatteryGauge';
import { MetricCard } from '../components/MetricCard';
import { ChargingIndicator } from '../components/ChargingIndicator';

export const DashboardScreen: React.FC = () => {
  const { snapshot, connectionStatus } = useVehicleStore();

  const statusColor =
    connectionStatus === 'connected'
      ? '#4CAF50'
      : connectionStatus === 'connecting'
      ? '#FF9800'
      : '#F44336';

  const statusLabel =
    connectionStatus === 'connected'
      ? 'Live'
      : connectionStatus === 'connecting'
      ? 'Connecting…'
      : 'Disconnected';

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Tescan</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Battery gauge */}
      <View style={styles.gaugeContainer}>
        <BatteryGauge soc={snapshot?.soc ?? null} size={220} />
        {snapshot?.estimated_range_km !== null && snapshot?.estimated_range_km !== undefined && (
          <Text style={styles.rangeText}>
            {Math.round(snapshot.estimated_range_km)} km est. range
          </Text>
        )}
      </View>

      {/* Row 1: speed, power, torque */}
      <View style={styles.row}>
        <MetricCard label="Speed" value={snapshot?.speed_mph ?? null} unit="mph" precision={0} />
        <MetricCard
          label="Power"
          value={snapshot?.power_kw ?? null}
          unit="kW"
          precision={1}
          color={
            snapshot?.power_kw !== null && snapshot?.power_kw !== undefined
              ? snapshot.power_kw >= 0
                ? '#FF9800'
                : '#4CAF50'
              : '#ffffff'
          }
        />
        <MetricCard label="Torque" value={snapshot?.torque_nm ?? null} unit="Nm" precision={0} />
      </View>

      {/* Row 2: battery temps */}
      <View style={styles.row}>
        <MetricCard
          label="Batt Min"
          value={snapshot?.battery_temp_min ?? null}
          unit="°C"
          precision={1}
          color="#64B5F6"
        />
        <MetricCard
          label="Batt Max"
          value={snapshot?.battery_temp_max ?? null}
          unit="°C"
          precision={1}
          color="#FF7043"
        />
        <MetricCard
          label="Cabin"
          value={snapshot?.cabin_temp ?? null}
          unit="°C"
          precision={1}
        />
      </View>

      {/* Row 3: odometer, HVAC */}
      <View style={styles.row}>
        <MetricCard
          label="Odometer"
          value={snapshot?.odometer_km ?? null}
          unit="km"
          precision={0}
        />
        <MetricCard
          label="HVAC"
          value={snapshot?.hvac_on !== null ? (snapshot?.hvac_on ? 'ON' : 'OFF') : null}
          unit=""
          precision={0}
          color={snapshot?.hvac_on ? '#4CAF50' : '#888'}
        />
      </View>

      {/* Charging indicator */}
      <ChargingIndicator
        chargingState={snapshot?.charging_state ?? null}
        rateKw={snapshot?.charge_rate_kw ?? null}
      />

      {/* Door status */}
      {snapshot?.doors && (
        <View style={styles.doorsContainer}>
          <Text style={styles.doorsTitle}>Doors</Text>
          <View style={styles.row}>
            {Object.entries(snapshot.doors).map(([k, open]) => (
              <View key={k} style={[styles.doorBadge, { borderColor: open ? '#F44336' : '#444' }]}>
                <Text style={[styles.doorLabel, { color: open ? '#F44336' : '#666' }]}>
                  {k.replace('_', ' ')}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#121212' },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '500' },
  gaugeContainer: { alignItems: 'center', marginVertical: 8 },
  rangeText: { color: '#888', fontSize: 13, marginTop: -8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginHorizontal: 6 },
  doorsContainer: { marginHorizontal: 12, marginTop: 12 },
  doorsTitle: { color: '#888', fontSize: 11, textTransform: 'uppercase', marginBottom: 6, marginLeft: 6 },
  doorBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    margin: 4,
  },
  doorLabel: { fontSize: 11, textTransform: 'capitalize' },
});
