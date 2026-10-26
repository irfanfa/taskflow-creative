import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import {
  X,
  LayoutDashboard,
  CheckSquare,
  Users,
  BarChart3,
  PlusCircle,
  Send,
  UserCircle,
  Shield,
  Clock,
  LogOut,
} from 'lucide-react-native';

interface SidebarDrawerProps {
  visible: boolean;
  onClose: () => void;
  activeScreen: string;
  onSelectScreen: (screenId: string) => void;
}

export function SidebarDrawer({
  visible,
  onClose,
  activeScreen,
  onSelectScreen,
}: SidebarDrawerProps) {
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const role = profile?.role || 'pegawai';

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
            onClose();
            await signOut();
          },
        },
      ]
    );
  };

  const getMenuItems = () => {
    switch (role) {
      case 'admin':
        return [
          {
            id: 'tasks',
            title: 'Ringkasan Dashboard',
            icon: LayoutDashboard,
          },
          {
            id: 'create_task',
            title: 'Buat Tugas Baru',
            icon: PlusCircle,
          },
          {
            id: 'pegawai_list',
            title: 'Manajemen Pegawai',
            icon: Users,
          },
          {
            id: 'reports',
            title: 'Laporan Kinerja',
            icon: BarChart3,
          },
          {
            id: 'sosmed_posting',
            title: 'Antrean Posting Sosmed',
            icon: Send,
          },
          {
            id: 'profile',
            title: 'Profil Saya',
            icon: UserCircle,
          },
        ];

      case 'pep':
        return [
          {
            id: 'tasks',
            title: 'Tugas Siaran (PEP)',
            icon: LayoutDashboard,
          },
          {
            id: 'create_task',
            title: 'Buat Tugas Siaran',
            icon: PlusCircle,
          },
          {
            id: 'profile',
            title: 'Profil Saya',
            icon: UserCircle,
          },
        ];

      case 'sosmed':
        return [
          {
            id: 'tasks',
            title: 'Tugas Saya',
            icon: LayoutDashboard,
          },
          {
            id: 'sosmed_posting',
            title: 'Antrean Konten Posting',
            icon: Send,
          },
          {
            id: 'profile',
            title: 'Profil Saya',
            icon: UserCircle,
          },
        ];

      case 'pegawai':
      default:
        return [
          {
            id: 'tasks',
            title: 'Tugas Saya',
            icon: CheckSquare,
          },
          {
            id: 'profile',
            title: 'Profil Saya',
            icon: UserCircle,
          },
        ];
    }
  };

  const menuItems = getMenuItems();

  const getRoleBadge = () => {
    switch (role) {
      case 'admin':
        return {
          title: 'Ketua Tim (Admin)',
          bg: '#FAF5FF',
          text: '#7E22CE',
          border: '#E9D5FF',
        };
      case 'pep':
        return {
          title: 'PEP (Siaran)',
          bg: '#FFFBEB',
          text: '#B45309',
          border: '#FDE68A',
        };
      case 'sosmed':
        return {
          title: 'Pengelola Sosmed',
          bg: '#EFF6FF',
          text: '#1D4ED8',
          border: '#BFDBFE',
        };
      case 'pegawai':
      default:
        return {
          title: profile?.spesialisasi || 'Pegawai Kreatif',
          bg: '#EEF2FF',
          text: '#4338CA',
          border: '#E0E7FF',
        };
    }
  };

  const roleBadge = getRoleBadge();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Backdrop tap to close */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Drawer Content */}
        <View
          style={[
            styles.drawerContent,
            {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          {/* Header Branding */}
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View style={styles.brandTextContainer}>
              <Text style={styles.brandTitle}>
                KMB Team <Text style={{ color: '#1737D6' }}>Creative</Text>
              </Text>
              <Text style={styles.brandSubtitle}>RRI Surabaya</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Role Access Panel */}
          <View style={styles.roleAccessContainer}>
            <Text style={styles.roleAccessLabel}>AKSES PANEL</Text>
            <View
              style={[
                styles.roleBadgeBox,
                { backgroundColor: roleBadge.bg, borderColor: roleBadge.border },
              ]}
            >
              <Shield size={12} color={roleBadge.text} style={{ marginRight: 4 }} />
              <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>
                {roleBadge.title}
              </Text>
            </View>
          </View>

          {/* Navigation Menu List */}
          <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
            <Text style={styles.menuHeaderLabel}>MENU NAVIGASI</Text>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreen === item.id;

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                  ]}
                  onPress={() => {
                    onSelectScreen(item.id);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Icon
                    size={18}
                    color={isActive ? '#1737D6' : '#64748B'}
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      isActive && styles.menuItemTextActive,
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Profile & Logout Footer */}
          <View style={styles.footerContainer}>
            <View style={styles.profileRow}>
              <View style={styles.footerAvatar}>
                <Text style={styles.footerAvatarText}>
                  {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
              <View style={styles.footerUserInfo}>
                <Text style={styles.footerUserName} numberOfLines={1}>
                  {profile?.nama || 'Pegawai'}
                </Text>
                <Text style={styles.footerUserEmail} numberOfLines={1}>
                  {profile?.email}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.logoutBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <LogOut size={16} color="#DC2626" />
              </TouchableOpacity>
            </View>

            {/* Timezone Info */}
            <View style={styles.timezoneRow}>
              <Clock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
              <Text style={styles.timezoneText}>Asia/Jakarta (WIB • UTC+7)</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  drawerContent: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoImg: {
    width: 26,
    height: 26,
  },
  brandTextContainer: {
    flex: 1,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  roleAccessContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  roleAccessLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  roleBadgeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  menuList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  menuHeaderLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 3,
  },
  menuItemActive: {
    backgroundColor: '#EEF2FF',
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  menuItemTextActive: {
    color: '#1737D6',
    fontWeight: '700',
  },
  footerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  footerAvatarText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1737D6',
  },
  footerUserInfo: {
    flex: 1,
  },
  footerUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  footerUserEmail: {
    fontSize: 11,
    color: '#64748B',
  },
  logoutBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  timezoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  timezoneText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
