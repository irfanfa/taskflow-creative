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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/auth-context';
import { supabase } from '../lib/supabase';
import { Task } from '../types/database';
import { TaskCard } from '../components/TaskCard';
import { TaskDetailModal } from './TaskDetailModal';
import {
  Search,
  Layers,
  Clock,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react-native';

export function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'urgent' | 'running' | 'review' | 'done'
  >('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          task_assignees (
            id,
            user_id,
            profiles (
              id,
              nama,
              spesialisasi,
              foto
            )
          )
        `)
        .is('deleted_at', null)
        .order('deadline', { ascending: true });

      if (error) {
        console.warn('Error fetching tasks from Supabase:', error.message);
      } else if (data) {
        let taskList = data as Task[];
        // Filter for regular pegawai
        if (profile?.role === 'pegawai') {
          taskList = taskList.filter((t) =>
            t.task_assignees?.some((ta) => ta.user_id === profile.id)
          );
        }
        setTasks(taskList);
      }
    } catch (e) {
      console.warn('Unexpected error fetching tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Supabase Realtime listener on 'tasks'
    const channel = supabase
      .channel('mobile-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          fetchTasks();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_assignees' },
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
    const now = new Date();

    if (selectedFilter === 'urgent') {
      const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      result = result.filter(
        (t) =>
          t.status !== 'Selesai' &&
          (t.prioritas === 'Urgent' ||
            t.prioritas === 'Tinggi' ||
            new Date(t.deadline) <= threeDaysFromNow)
      );
    } else if (selectedFilter === 'running') {
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

  // Statistics calculation
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
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header with Safe Inset */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greetingTitle}>
            Halo, {profile?.nama || 'Rekan Tim'} 👋
          </Text>
          <View style={styles.roleBadgeHeader}>
            <Text style={styles.roleTextHeader}>
              {profile?.role === 'admin'
                ? 'Ketua Tim (Admin)'
                : profile?.role === 'pep'
                ? 'PEP (Siaran)'
                : profile?.role === 'sosmed'
                ? 'Pengelola Sosmed'
                : profile?.spesialisasi || 'Pegawai Kreatif'}
            </Text>
          </View>
        </View>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {profile?.nama ? profile.nama.charAt(0).toUpperCase() : 'U'}
          </Text>
        </View>
      </View>

      {/* Stats Summary Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.borderIndigo]}>
          <Layers size={16} color="#4F46E5" style={styles.statIcon} />
          <Text style={styles.statNumber}>{totalCount}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={[styles.statCard, styles.borderBlue]}>
          <Clock size={16} color="#0284C7" style={styles.statIcon} />
          <Text style={styles.statNumber}>{runningCount}</Text>
          <Text style={styles.statLabel}>Berjalan</Text>
        </View>

        <View style={[styles.statCard, styles.borderPurple]}>
          <Eye size={16} color="#7E22CE" style={styles.statIcon} />
          <Text style={styles.statNumber}>{reviewCount}</Text>
          <Text style={styles.statLabel}>Review</Text>
        </View>

        <View style={[styles.statCard, styles.borderGreen]}>
          <CheckCircle2 size={16} color="#16A34A" style={styles.statIcon} />
          <Text style={styles.statNumber}>{doneCount}</Text>
          <Text style={styles.statLabel}>Selesai</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Search size={16} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari judul, klien, atau jenis pekerjaan..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs Scrollable */}
      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'all' && styles.filterChipTextActive,
              ]}
            >
              Semua ({totalCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'urgent' && styles.filterChipActiveAmber,
            ]}
            onPress={() => setSelectedFilter('urgent')}
          >
            <AlertTriangle
              size={12}
              color={selectedFilter === 'urgent' ? '#FFFFFF' : '#B45309'}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'urgent' && styles.filterChipTextActive,
              ]}
            >
              Perlu Tindakan
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'running' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedFilter('running')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'running' && styles.filterChipTextActive,
              ]}
            >
              Berjalan ({runningCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'review' && styles.filterChipActivePurple,
            ]}
            onPress={() => setSelectedFilter('review')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'review' && styles.filterChipTextActive,
              ]}
            >
              Review ({reviewCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedFilter === 'done' && styles.filterChipActiveGreen,
            ]}
            onPress={() => setSelectedFilter('done')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilter === 'done' && styles.filterChipTextActive,
              ]}
            >
              Selesai ({doneCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
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
              <View style={styles.emptyIconCircle}>
                <Layers size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Tidak ada tugas ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery
                  ? 'Coba gunakan kata kunci pencarian yang lain'
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
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerLeft: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  roleBadgeHeader: {
    alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 3,
  },
  roleTextHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1737D6',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#C7D2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1737D6',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  borderIndigo: {
    borderLeftWidth: 3,
    borderLeftColor: '#4F46E5',
  },
  borderBlue: {
    borderLeftWidth: 3,
    borderLeftColor: '#0284C7',
  },
  borderPurple: {
    borderLeftWidth: 3,
    borderLeftColor: '#7E22CE',
  },
  borderGreen: {
    borderLeftWidth: 3,
    borderLeftColor: '#16A34A',
  },
  statIcon: {
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  filterWrapper: {
    marginBottom: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#1737D6',
    borderColor: '#1737D6',
  },
  filterChipActiveAmber: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  filterChipActivePurple: {
    backgroundColor: '#7E22CE',
    borderColor: '#7E22CE',
  },
  filterChipActiveGreen: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
