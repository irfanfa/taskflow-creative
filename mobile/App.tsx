import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CheckSquare, User as UserIcon } from 'lucide-react-native';

function MainNavigator() {
  const { session, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'tasks' | 'profile'>('tasks');

  if (isLoading) {
    return (
      <View style={styles.splashContainer}>
        <View style={styles.splashLogoBox}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.splashLogo}
            resizeMode="contain"
          />
        </View>
        <ActivityIndicator size="large" color="#1737D6" style={{ marginTop: 20 }} />
        <Text style={styles.splashText}>Memuat KMB Creative Native...</Text>
      </View>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar style="dark" />

      {/* Screen Body */}
      <View style={styles.screenBody}>
        {currentTab === 'tasks' ? <DashboardScreen /> : <ProfileScreen />}
      </View>

      {/* Native Bottom Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentTab('tasks')}
          activeOpacity={0.7}
        >
          <CheckSquare
            size={22}
            color={currentTab === 'tasks' ? '#1737D6' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'tasks' && styles.tabLabelActive,
            ]}
          >
            Tugas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentTab('profile')}
          activeOpacity={0.7}
        >
          <UserIcon
            size={22}
            color={currentTab === 'profile' ? '#1737D6' : '#94A3B8'}
          />
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'profile' && styles.tabLabelActive,
            ]}
          >
            Profil
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  screenBody: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 4,
  },
  tabLabelActive: {
    color: '#1737D6',
    fontWeight: '700',
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashLogoBox: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1737D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  splashLogo: {
    width: 72,
    height: 72,
  },
  splashText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    fontWeight: '500',
  },
});
