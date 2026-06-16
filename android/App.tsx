import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

import { DashboardScreen } from './src/screens/DashboardScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { tescanWS } from './src/services/websocket';
import { getBackendUrl } from './src/services/api';

const Tab = createBottomTabNavigator();

export default function App() {
  useEffect(() => {
    // Connect WebSocket on app start using persisted backend URL
    getBackendUrl().then((url) => tescanWS.connect(url));
    return () => tescanWS.disconnect();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: '#4CAF50',
            background: '#121212',
            card: '#1e1e1e',
            text: '#ffffff',
            border: '#2a2a2a',
            notification: '#4CAF50',
          },
        }}
      >
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: '#1a1a1a', borderTopColor: '#2a2a2a' },
            tabBarActiveTintColor: '#4CAF50',
            tabBarInactiveTintColor: '#666',
          }}
        >
          <Tab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ tabBarLabel: 'Dashboard' }}
          />
          <Tab.Screen
            name="History"
            component={HistoryScreen}
            options={{ tabBarLabel: 'History' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarLabel: 'Settings' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
