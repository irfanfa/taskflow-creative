import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import {
  Shield,
  Palette,
  Clock,
  LogOut,
  Smartphone,
  Info,
  CheckCircle2,
} from 'lucide-react-native';

export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Konfirmasi Keluar',
      'Apakah Anda yakin ingin keluar dari akun ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.mainWrapper, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{profile?.nama || 'Nama Pegawai'}</Text>
          <Text style={styles.userEmail}>{profile?.email}</Text>

          <View style={styles.badgeContainer}>
            <View style={styles.roleBadge}>
              <Shield size={12} color="#4F46E5" style={{ marginRight: 4 }} />
              <Text style={styles.roleBadgeText}>
                {profile?.role === 'admin'
                  ? 'Ketua Tim (Admin)'
                  : profile?.role === 'pep'
                  ? 'PEP (Siaran)'
                  : profile?.role === 'sosmed'
                  ? 'Pengelola Sosmed'
                  : 'Pegawai Kreatif'}
              </Text>
            </View>

            {profile?.spesialisasi && (
              <View style={styles.specBadge}>
                <Palette size={12} color="#0284C7" style={{ marginRight: 4 }} />
                <Text style={styles.specBadgeText}>{profile.spesialisasi}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Informasi Kerja & Sistem</Text>

          <View style={styles.infoItem}>
            <View style={styles.iconCircle}>
              <Clock size={16} color="#1737D6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Zona Waktu Kerja</Text>
              <Text style={styles.infoDesc}>Asia/Jakarta (WIB • UTC+7)</Text>
            </View>
          </View>

          <View style={styles.infoItem}>
            <View style={styles.iconCircle}>
              <Smartphone size={16} color="#1737D6" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Arsitektur Aplikasi</Text>
              <Text style={styles.infoDesc}>Full Native (React Native 0.88 + Expo 58)</Text>
            </View>
          </View>

          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <View style={styles.iconCircle}>
              <CheckCircle2 size={16} color="#16A34A" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Sinkronisasi Realtime</Text>
              <Text style={styles.infoDesc}>Supabase Realtime PostgreSQL WebSocket</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Keluar dari Akun</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>KMB Team Creative Native v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  avatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1737D6',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  specBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  infoDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#94A3B8',
  },
});
