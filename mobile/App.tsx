import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { CheckSquare, User as UserIcon } from 'lucide-react-native';

function MainNavigator() {
  const insets = useSafeAreaInsets();
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

  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 56 + bottomPadding;

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" />

      {/* Screen Body */}
      <View style={styles.screenBody}>
        {currentTab === 'tasks' ? <DashboardScreen /> : <ProfileScreen />}
      </View>

      {/* Native Bottom Tab Bar with Inset Protection */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: bottomPadding,
            height: barHeight,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentTab('tasks')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.tabIconWrapper,
              currentTab === 'tasks' && styles.tabIconWrapperActive,
            ]}
          >
            <CheckSquare
              size={20}
              color={currentTab === 'tasks' ? '#1737D6' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'tasks' && styles.tabLabelActive,
            ]}
          >
            Daftar Tugas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setCurrentTab('profile')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.tabIconWrapper,
              currentTab === 'profile' && styles.tabIconWrapperActive,
            ]}
          >
            <UserIcon
              size={20}
              color={currentTab === 'profile' ? '#1737D6' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              currentTab === 'profile' && styles.tabLabelActive,
            ]}
          >
            Profil Akun
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  screenBody: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 6,
  },
  tabIconWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  tabIconWrapperActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
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
    shadowOpacity: 0.12,
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
    fontWeight: '600',
  },
});
