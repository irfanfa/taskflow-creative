import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/database';
import { Users, Mail, Palette, Briefcase, CheckCircle2 } from 'lucide-react-native';

interface PegawaiWithStats extends Profile {
  active_tasks_count?: number;
}

export function PegawaiListScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<PegawaiWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchEmployees = async () => {
    try {
      // 1. Fetch profiles
      const { data: profilesData, error: profilesErr } = await supabase
        .from('profiles')
        .select('*')
        .is('deleted_at', null)
        .order('nama', { ascending: true });

      if (!profilesErr && profilesData) {
        // 2. Fetch active tasks assignees to count workload
        const { data: assigneesData } = await supabase
          .from('task_assignees')
          .select('user_id, tasks!inner(status)')
          .neq('tasks.status', 'Selesai');

        const workloadMap: Record<string, number> = {};
        (assigneesData || []).forEach((a: any) => {
          workloadMap[a.user_id] = (workloadMap[a.user_id] || 0) + 1;
        });

        const formatted = (profilesData as Profile[]).map((p) => ({
          ...p,
          active_tasks_count: workloadMap[p.id] || 0,
        }));

        setEmployees(formatted);
      }
    } catch (e) {
      console.warn('Error fetching employees:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Manajemen Pegawai</Text>
          <Text style={styles.headerSubtitle}>
            Daftar seluruh tim kreatif dan beban kerja aktif
          </Text>
        </View>
        <View style={styles.badgeCount}>
          <Users size={14} color="#1737D6" style={{ marginRight: 4 }} />
          <Text style={styles.badgeCountText}>{employees.length} Orang</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1737D6" />
          <Text style={styles.loadingText}>Memuat data tim...</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1737D6']}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {item.nama ? item.nama.charAt(0).toUpperCase() : 'P'}
                  </Text>
                </View>

                <View style={styles.infoWrapper}>
                  <Text style={styles.nameText}>{item.nama}</Text>
                  <View style={styles.emailRow}>
                    <Mail size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.emailText}>{item.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>
                    {item.role === 'admin'
                      ? 'Ketua Tim (Admin)'
                      : item.role === 'pep'
                      ? 'PEP (Siaran)'
                      : item.role === 'sosmed'
                      ? 'Pengelola Sosmed'
                      : item.spesialisasi || 'Pegawai Kreatif'}
                  </Text>
                </View>

                <View style={styles.workloadPill}>
                  <Briefcase size={12} color="#1737D6" style={{ marginRight: 4 }} />
                  <Text style={styles.workloadText}>
                    {item.active_tasks_count || 0} Tugas Aktif
                  </Text>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeCount: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1737D6',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1737D6',
  },
  infoWrapper: {
    flex: 1,
  },
  nameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  emailText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rolePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  workloadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  workloadText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1737D6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748B',
  },
});
