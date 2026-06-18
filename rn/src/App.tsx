import React, { useEffect } from 'react';
import { StatusBar, Platform, PermissionsAndroid } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  Home as HomeIcon, Battery, Fan, MapPin, Activity, Settings,
} from 'lucide-react-native';

import { HomeScreen }     from './screens/HomeScreen';
import { BatteryScreen }  from './screens/BatteryScreen';
import { ClimateScreen }  from './screens/ClimateScreen';
import { LocationScreen } from './screens/LocationScreen';
import { LogScreen }      from './screens/LogScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useVehicleStore }from './store/vehicleStore';
import { T, DISP }        from './theme';

const Tab = createBottomTabNavigator();

const TAB_ICON: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Home:     HomeIcon,
  Battery,
  Climate:  Fan,
  Location: MapPin,
  Log:      Activity,
  Settings,
};

async function requestBlePermissions() {
  if (Platform.OS !== 'android') return;
  if (Platform.Version < 31) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION!);
  } else {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN!,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT!,
    ]);
  }
}

export default function App() {
  const startBle = useVehicleStore(s => s.startBle);
  const stopBle  = useVehicleStore(s => s.stopBle);

  useEffect(() => {
    requestBlePermissions().then(startBle);
    return () => stopBle();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={T.ink} />
      <NavigationContainer theme={{
        dark: true,
        colors: {
          primary:    T.cyan,
          background: T.ink,
          card:       T.ink,
          text:       T.hi,
          border:     T.border,
          notification: T.amber,
        },
      }}>
        <Tab.Navigator
          screenOptions={({ route }) => {
            const Icon = TAB_ICON[route.name] ?? HomeIcon;
            return {
              tabBarIcon: ({ color, size }) => <Icon size={size} color={color} />,
              tabBarActiveTintColor:   T.cyan,
              tabBarInactiveTintColor: T.lo,
              tabBarStyle: {
                backgroundColor: T.ink,
                borderTopColor:  T.border,
                borderTopWidth:  1,
                paddingBottom:   4,
                height:          60,
              },
              tabBarLabelStyle: { fontFamily: DISP, fontSize: 10 },
              headerStyle:      { backgroundColor: T.ink, borderBottomColor: T.border, borderBottomWidth: 1 },
              headerTintColor:  T.hi,
              headerTitleStyle: { fontFamily: DISP, fontWeight: '600', fontSize: 19 },
            };
          }}
        >
          <Tab.Screen name="Home"     component={HomeScreen}     options={{ title: 'Josh' }} />
          <Tab.Screen name="Battery"  component={BatteryScreen} />
          <Tab.Screen name="Climate"  component={ClimateScreen} />
          <Tab.Screen name="Location" component={LocationScreen} />
          <Tab.Screen name="Log"      component={LogScreen} />
          <Tab.Screen name="Settings" component={SettingsScreen} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
