import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth-context';
import { Task } from '../types/database';
import { Send, Share2, ExternalLink, CheckCircle2 } from 'lucide-react-native';

export function SosmedPostingScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [postingTaskId, setPostingTaskId] = useState<string | null>(null);
  const [postingLink, setPostingLink] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPostingTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .is('deleted_at', null)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        // Filter tasks that are ready for posting (status Selesai or status_posting)
        const readyTasks = (data as Task[]).filter(
          (t) => t.status === 'Selesai' || t.status_posting === 'menunggu_posting'
        );
        setTasks(readyTasks);
      }
    } catch (e) {
      console.warn('Error fetching sosmed tasks:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPostingTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPostingTasks();
  };

  const handleMarkAsPosted = async (taskId: string) => {
    if (!postingLink.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan tautan (link) postingan media sosial.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status_posting: 'sudah_diposting',
          link_posting: postingLink.trim(),
          posted_at: new Date().toISOString(),
          posted_by: profile?.id || null,
        })
        .eq('id', taskId);

      if (error) throw error;

      Alert.alert('Sukses', 'Konten berhasil ditandai sebagai sudah diposting!');
      setPostingTaskId(null);
      setPostingLink('');
      fetchPostingTasks();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan status posting.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Antrean Posting Sosmed</Text>
          <Text style={styles.headerSubtitle}>
            Konten tuntas tim kreatif yang siap tayang ke media sosial
          </Text>
        </View>
        <View style={styles.headerIconCircle}>
          <Send size={16} color="#1737D6" />
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1737D6" />
          <Text style={styles.loadingText}>Memuat antrean posting...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
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
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{item.jenis_pekerjaan}</Text>
                </View>
                <View
                  style={[
                    styles.postingStatusBadge,
                    item.status_posting === 'sudah_diposting'
                      ? styles.bgGreen
                      : styles.bgAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.postingStatusText,
                      item.status_posting === 'sudah_diposting'
                        ? styles.textGreen
                        : styles.textAmber,
                    ]}
                  >
                    {item.status_posting === 'sudah_diposting'
                      ? 'Sudah Tayang'
                      : 'Siap Posting'}
                  </Text>
                </View>
              </View>

              <Text style={styles.taskTitle}>{item.judul}</Text>
              <Text style={styles.clientText}>Program: {item.klien_proyek}</Text>

              {item.link_hasil && (
                <View style={styles.linkHasilBox}>
                  <Text style={styles.linkHasilLabel}>File Siap Unduh:</Text>
                  <Text style={styles.linkHasilUrl} numberOfLines={1}>
                    {item.link_hasil}
                  </Text>
                </View>
              )}

              {/* Action Form */}
              {item.status_posting !== 'sudah_diposting' && (
                <View style={styles.actionBox}>
                  {postingTaskId === item.id ? (
                    <View style={styles.inputArea}>
                      <TextInput
                        style={styles.linkInput}
                        placeholder="Tempel link postingan (IG / YouTube / TikTok)..."
                        placeholderTextColor="#94A3B8"
                        value={postingLink}
                        onChangeText={setPostingLink}
                      />
                      <View style={styles.btnRow}>
                        <TouchableOpacity
                          style={styles.cancelBtn}
                          onPress={() => setPostingTaskId(null)}
                        >
                          <Text style={styles.cancelBtnText}>Batal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.confirmBtn}
                          onPress={() => handleMarkAsPosted(item.id)}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                          ) : (
                            <Text style={styles.confirmBtnText}>Konfirmasi Tayang</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.publishBtn}
                      onPress={() => {
                        setPostingTaskId(item.id);
                        setPostingLink('');
                      }}
                    >
                      <Share2 size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.publishBtnText}>Input Link Postingan</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Send size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>Tidak ada antrean posting</Text>
              <Text style={styles.emptySubtitle}>
                Semua konten telah tayang atau belum ada tugas selesai dari tim kreatif.
              </Text>
            </View>
          }
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
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
  },
  postingStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  postingStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  bgGreen: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  textGreen: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '700',
  },
  bgAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  textAmber: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  clientText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  linkHasilBox: {
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  linkHasilLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '700',
  },
  linkHasilUrl: {
    fontSize: 12,
    color: '#1737D6',
    marginTop: 2,
  },
  actionBox: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  publishBtn: {
    flexDirection: 'row',
    backgroundColor: '#1737D6',
    borderRadius: 10,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  inputArea: {
    gap: 8,
  },
  linkInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 13,
    color: '#0F172A',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#16A34A',
    borderRadius: 10,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
