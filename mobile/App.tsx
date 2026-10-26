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
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/auth-context';
import { LoginScreen } from './src/screens/LoginScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { PegawaiListScreen } from './src/screens/PegawaiListScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { CreateTaskScreen } from './src/screens/CreateTaskScreen';
import { SosmedPostingScreen } from './src/screens/SosmedPostingScreen';
import { SidebarDrawer } from './src/components/SidebarDrawer';
import {
  Menu,
  CheckSquare,
  Users,
  BarChart3,
  PlusCircle,
  Send,
  User as UserIcon,
} from 'lucide-react-native';

function MainNavigator() {
  const insets = useSafeAreaInsets();
  const { session, profile, isLoading } = useAuth();
  const [activeScreen, setActiveScreen] = useState<string>('tasks');
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const role = profile?.role || 'pegawai';

  // Dynamic bottom tabs based on role
  const getBottomTabs = () => {
    switch (role) {
      case 'admin':
        return [
          { id: 'tasks', label: 'Tugas', icon: CheckSquare },
          { id: 'create_task', label: 'Buat Tugas', icon: PlusCircle },
          { id: 'pegawai_list', label: 'Pegawai', icon: Users },
          { id: 'reports', label: 'Laporan', icon: BarChart3 },
          { id: 'profile', label: 'Profil', icon: UserIcon },
        ];
      case 'pep':
        return [
          { id: 'tasks', label: 'Tugas Siaran', icon: CheckSquare },
          { id: 'create_task', label: 'Buat Tugas', icon: PlusCircle },
          { id: 'profile', label: 'Profil', icon: UserIcon },
        ];
      case 'sosmed':
        return [
          { id: 'tasks', label: 'Tugas', icon: CheckSquare },
          { id: 'sosmed_posting', label: 'Posting', icon: Send },
          { id: 'profile', label: 'Profil', icon: UserIcon },
        ];
      case 'pegawai':
      default:
        return [
          { id: 'tasks', label: 'Tugas Saya', icon: CheckSquare },
          { id: 'profile', label: 'Profil', icon: UserIcon },
        ];
    }
  };

  const bottomTabs = getBottomTabs();
  const bottomPadding = Math.max(insets.bottom, 12);
  const barHeight = 56 + bottomPadding;

  const renderActiveScreen = () => {
    switch (activeScreen) {
      case 'tasks':
        return <DashboardScreen />;
      case 'create_task':
        return <CreateTaskScreen onTaskCreated={() => setActiveScreen('tasks')} />;
      case 'pegawai_list':
        return <PegawaiListScreen />;
      case 'reports':
        return <ReportsScreen />;
      case 'sosmed_posting':
        return <SosmedPostingScreen />;
      case 'profile':
      default:
        return <ProfileScreen />;
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="dark" />

      {/* Screen Body */}
      <View style={styles.screenBody}>
        {renderActiveScreen()}

        {/* Floating Hamburger Button for Full Website-Style Drawer */}
        <TouchableOpacity
          style={[styles.floatingMenuBtn, { top: Math.max(insets.top, 14) + 10 }]}
          onPress={() => setDrawerOpen(true)}
          activeOpacity={0.8}
        >
          <Menu size={20} color="#1737D6" />
        </TouchableOpacity>
      </View>

      {/* Role-Based Bottom Tab Bar with Inset Protection */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: bottomPadding,
            height: barHeight,
          },
        ]}
      >
        {bottomTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeScreen === tab.id;

          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tabButton}
              onPress={() => setActiveScreen(tab.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.tabIconWrapper,
                  isActive && styles.tabIconWrapperActive,
                ]}
              >
                <Icon
                  size={19}
                  color={isActive ? '#1737D6' : '#64748B'}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive && styles.tabLabelActive,
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Full Website-Style Sidebar Drawer */}
      <SidebarDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        activeScreen={activeScreen}
        onSelectScreen={(screenId) => setActiveScreen(screenId)}
      />
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
  floatingMenuBtn: {
    position: 'absolute',
    right: 70,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1737D6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    paddingTop: 5,
  },
  tabIconWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tabIconWrapperActive: {
    backgroundColor: '#EEF2FF',
  },
  tabLabel: {
    fontSize: 10,
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
