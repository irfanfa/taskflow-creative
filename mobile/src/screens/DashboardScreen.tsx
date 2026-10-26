import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase';
import { Task } from '../types/database';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import { Search, Filter, Layers, Clock, AlertCircle, CheckCircle2 } from 'lucide-react-native';

export function DashboardScreen() {
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'running' | 'review' | 'done'
  >('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      let query = supabase
        .from('tugas')
        .select('*')
        .order('deadline', { ascending: true });

      // If user is regular pegawai, show tasks assigned to them
      if (profile?.role === 'pegawai') {
        query = query.eq('assigned_to', profile.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        setTasks(data as Task[]);
      }
    } catch (e) {
      console.warn('Error fetching tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Setup Supabase Realtime listener
    const channel = supabase
      .channel('mobile-tugas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tugas' },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile]);

  // Filter & Search logic
  useEffect(() => {
    let result = [...tasks];

    // Filter by tab
    if (selectedFilter === 'running') {
      result = result.filter(
        (t) =>
          t.status === 'Sedang Dikerjakan' ||
          t.status === 'Belum Dimulai' ||
          t.status === 'Dalam Antrean'
      );
    } else if (selectedFilter === 'review') {
      result = result.filter(
        (t) => t.status === 'Menunggu Review' || t.status === 'Revisi'
      );
    } else if (selectedFilter === 'done') {
      result = result.filter((t) => t.status === 'Selesai');
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.judul.toLowerCase().includes(q) ||
          (t.klien_proyek && t.klien_proyek.toLowerCase().includes(q)) ||
          t.jenis_pekerjaan.toLowerCase().includes(q)
      );
    }

    setFilteredTasks(result);
  }, [tasks, selectedFilter, searchQuery]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchTasks();
  }, [profile]);

  // Calculate statistics
  const totalCount = tasks.length;
  const runningCount = tasks.filter(
    (t) =>
      t.status === 'Sedang Dikerjakan' ||
      t.status === 'Belum Dimulai' ||
      t.status === 'Dalam Antrean'
  ).length;
  const reviewCount = tasks.filter(
    (t) => t.status === 'Menunggu Review' || t.status === 'Revisi'
  ).length;
  const doneCount = tasks.filter((t) => t.status === 'Selesai').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>
            Halo, {profile?.nama || 'Rekan Tim'} 👋
          </Text>
          <Text style={styles.roleSubtext}>
            {profile?.role === 'admin'
              ? 'Ketua Tim (Admin)'
              : profile?.role === 'pep'
              ? 'PEP (Siaran)'
              : profile?.role === 'sosmed'
              ? 'Pengelola Sosmed'
              : profile?.spesialisasi || 'Pegawai Kreatif'}
          </Text>
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      {/* Statistics Banner */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Layers size={16} color="#1737D6" style={styles.statIcon} />
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Clock size={16} color="#0284C7" style={styles.statIcon} />
          <Text style={styles.statNumber}>{runningCount}</Text>
          <Text style={styles.statLabel}>Berjalan</Text>
        </View>
        <View style={styles.statBox}>
          <AlertCircle size={16} color="#D97706" style={styles.statIcon} />
          <Text style={styles.statNumber}>{reviewCount}</Text>
          <Text style={styles.statLabel}>Review</Text>
        </View>
        <View style={styles.statBox}>
          <CheckCircle2 size={16} color="#16A34A" style={styles.statIcon} />
          <Text style={styles.statNumber}>{doneCount}</Text>
          <Text style={styles.statLabel}>Selesai</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <Search size={18} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari judul, klien, atau jenis tugas..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            selectedFilter === 'all' && styles.tabItemActive,
          ]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'all' && styles.tabTextActive,
            ]}
          >
            Semua ({totalCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            selectedFilter === 'running' && styles.tabItemActive,
          ]}
          onPress={() => setSelectedFilter('running')}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'running' && styles.tabTextActive,
            ]}
          >
            Berjalan ({runningCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            selectedFilter === 'review' && styles.tabItemActive,
          ]}
          onPress={() => setSelectedFilter('review')}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'review' && styles.tabTextActive,
            ]}
          >
            Review ({reviewCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            selectedFilter === 'done' && styles.tabItemActive,
          ]}
          onPress={() => setSelectedFilter('done')}
        >
          <Text
            style={[
              styles.tabText,
              selectedFilter === 'done' && styles.tabTextActive,
            ]}
          >
            Selesai ({doneCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1737D6" />
          <Text style={styles.loadingText}>Memuat tugas realtime...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TaskCard task={item} onPress={(t) => setSelectedTask(t)} />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1737D6']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Layers size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Tidak ada tugas ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Coba ganti kata kunci pencarian Anda'
                  : 'Belum ada tugas pada kategori ini'}
              </Text>
            </View>
          }
        />
      )}

      {/* Task Detail Modal */}
      <TaskDetailModal
        task={selectedTask}
        visible={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={fetchTasks}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  roleSubtext: {
    fontSize: 12,
    color: '#1737D6',
    fontWeight: '600',
    marginTop: 2,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1737D6',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 1,
  },
  statIcon: {
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: '#0F172A',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 6,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabItemActive: {
    backgroundColor: '#1737D6',
    borderColor: '#1737D6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
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
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
});
