import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Task } from '../types/database';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Flame,
} from 'lucide-react-native';

export function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReportData = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null);

      if (!error && data) {
        setTasks(data as Task[]);
      }
    } catch (e) {
      console.warn('Error fetching reports:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReportData();
  };

  // Metrics
  const total = tasks.length;
  const selesai = tasks.filter((t) => t.status === 'Selesai').length;
  const completionRate = total > 0 ? Math.round((selesai / total) * 100) : 0;

  const urgentCount = tasks.filter((t) => t.prioritas === 'Urgent').length;
  const tinggiCount = tasks.filter((t) => t.prioritas === 'Tinggi').length;
  const sedangCount = tasks.filter((t) => t.prioritas === 'Sedang').length;
  const rendahCount = tasks.filter((t) => t.prioritas === 'Rendah').length;

  const antreanCount = tasks.filter(
    (t) => t.status === 'Dalam Antrean' || t.status === 'Belum Dimulai'
  ).length;
  const pengerjaanCount = tasks.filter(
    (t) => t.status === 'Sedang Dikerjakan'
  ).length;
  const reviewCount = tasks.filter(
    (t) => t.status === 'Menunggu Review'
  ).length;
  const revisiCount = tasks.filter((t) => t.status === 'Revisi').length;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Laporan Kinerja Tim</Text>
          <Text style={styles.headerSubtitle}>
            Metrik efektivitas, penyelesaian, dan beban kerja
          </Text>
        </View>
        <View style={styles.badgeHeader}>
          <BarChart3 size={16} color="#1737D6" />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1737D6" />
          <Text style={styles.loadingText}>Memuat statistik...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1737D6']}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Main Progress Card */}
          <View style={styles.cardHighlight}>
            <View style={styles.highlightTop}>
              <View>
                <Text style={styles.highlightLabel}>Tingkat Penyelesaian</Text>
                <Text style={styles.highlightPercent}>{completionRate}%</Text>
              </View>
              <View style={styles.highlightStats}>
                <Text style={styles.highlightSub}>
                  {selesai} dari {total} Tugas Tuntas
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${completionRate}%` },
                ]}
              />
            </View>
          </View>

          {/* Status Breakdown Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Distribusi Status Tugas</Text>

            <View style={styles.metricRow}>
              <View style={styles.metricItem}>
                <Clock size={16} color="#475569" style={styles.metricIcon} />
                <Text style={styles.metricNumber}>{antreanCount}</Text>
                <Text style={styles.metricLabel}>Antrean</Text>
              </View>

              <View style={styles.metricItem}>
                <Clock size={16} color="#0284C7" style={styles.metricIcon} />
                <Text style={[styles.metricNumber, { color: '#0284C7' }]}>
                  {pengerjaanCount}
                </Text>
                <Text style={styles.metricLabel}>Dikerjakan</Text>
              </View>

              <View style={styles.metricItem}>
                <AlertCircle size={16} color="#7E22CE" style={styles.metricIcon} />
                <Text style={[styles.metricNumber, { color: '#7E22CE' }]}>
                  {reviewCount}
                </Text>
                <Text style={styles.metricLabel}>Review</Text>
              </View>

              <View style={styles.metricItem}>
                <AlertTriangle size={16} color="#D97706" style={styles.metricIcon} />
                <Text style={[styles.metricNumber, { color: '#D97706' }]}>
                  {revisiCount}
                </Text>
                <Text style={styles.metricLabel}>Revisi</Text>
              </View>
            </View>
          </View>

          {/* Priority Breakdown Section */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Tingkat Prioritas Pekerjaan</Text>

            <View style={styles.priorityList}>
              <View style={styles.priorityRow}>
                <View style={[styles.priorityBadge, styles.bgRose]}>
                  <Flame size={12} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={[styles.priorityText, { color: '#DC2626' }]}>
                    Urgent
                  </Text>
                </View>
                <Text style={styles.priorityCount}>{urgentCount} Tugas</Text>
              </View>

              <View style={styles.priorityRow}>
                <View style={[styles.priorityBadge, styles.bgAmber]}>
                  <Text style={[styles.priorityText, { color: '#B45309' }]}>
                    Tinggi
                  </Text>
                </View>
                <Text style={styles.priorityCount}>{tinggiCount} Tugas</Text>
              </View>

              <View style={styles.priorityRow}>
                <View style={[styles.priorityBadge, styles.bgBlue]}>
                  <Text style={[styles.priorityText, { color: '#1D4ED8' }]}>
                    Sedang
                  </Text>
                </View>
                <Text style={styles.priorityCount}>{sedangCount} Tugas</Text>
              </View>

              <View style={styles.priorityRow}>
                <View style={[styles.priorityBadge, styles.bgSlate]}>
                  <Text style={[styles.priorityText, { color: '#475569' }]}>
                    Rendah
                  </Text>
                </View>
                <Text style={styles.priorityCount}>{rendahCount} Tugas</Text>
              </View>
            </View>
          </View>
        </ScrollView>
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
  badgeHeader: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  cardHighlight: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1737D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  highlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  highlightLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  highlightPercent: {
    fontSize: 32,
    fontWeight: '800',
    color: '#16A34A',
    marginTop: 2,
  },
  highlightStats: {
    alignItems: 'flex-end',
  },
  highlightSub: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 14,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricIcon: {
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  priorityList: {
    gap: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priorityCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  bgRose: {
    backgroundColor: '#FFF1F2',
  },
  bgAmber: {
    backgroundColor: '#FFFBEB',
  },
  bgBlue: {
    backgroundColor: '#EFF6FF',
  },
  bgSlate: {
    backgroundColor: '#F8FAFC',
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
