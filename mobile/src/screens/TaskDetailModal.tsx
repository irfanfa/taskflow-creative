import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Task, TaskStatus } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { DeadlineIndicator } from '../components/DeadlineIndicator';
import { supabase } from '../lib/supabase';
import {
  X,
  Calendar,
  Briefcase,
  FileText,
  Settings,
  Users,
  ExternalLink,
  PlayCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react-native';

interface TaskDetailModalProps {
  task: Task | null;
  visible: boolean;
  onClose: () => void;
  onTaskUpdated?: () => void;
}

export function TaskDetailModal({
  task,
  visible,
  onClose,
  onTaskUpdated,
}: TaskDetailModalProps) {
  const insets = useSafeAreaInsets();
  const [updating, setUpdating] = useState(false);

  if (!task) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }) + ' WIB';
    } catch {
      return dateStr;
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', task.id);

      if (error) {
        Alert.alert('Gagal', error.message || 'Tidak dapat memperbarui status.');
      } else {
        Alert.alert('Sukses', `Status tugas diubah menjadi "${newStatus}"`);
        if (onTaskUpdated) onTaskUpdated();
        onClose();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openUrl = (url: string) => {
    if (!url) return;
    const fullUrl = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(fullUrl).catch(() => {
      Alert.alert('Perhatian', 'Tidak dapat membuka tautan ini.');
    });
  };

  const specs = task.spesifikasi_teknis || {};
  const assignees = task.task_assignees || [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { paddingBottom: Math.max(insets.bottom, 20) },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badgeRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{task.jenis_pekerjaan}</Text>
              </View>
              <PriorityBadge priority={task.prioritas} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={styles.title}>{task.judul}</Text>

            {/* Status & Deadline Row */}
            <View style={styles.statusDeadlineRow}>
              <StatusBadge status={task.status} />
              <DeadlineIndicator
                deadline={task.deadline}
                isCompleted={task.status === 'Selesai'}
              />
            </View>

            {/* Klien / Proyek */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Briefcase size={15} color="#4F46E5" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Klien / Proyek</Text>
              </View>
              <Text style={styles.sectionText}>
                {task.klien_proyek || 'Internal Instansi RRI'}
              </Text>
            </View>

            {/* Petugas yang Ditugaskan */}
            {assignees.length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Users size={15} color="#4F46E5" style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Petugas Ditugaskan</Text>
                </View>
                <View style={styles.assigneesList}>
                  {assignees.map((ta) => (
                    <View key={ta.id} style={styles.assigneeChip}>
                      <View style={styles.assigneeInitialCircle}>
                        <Text style={styles.assigneeInitialText}>
                          {ta.profiles?.nama ? ta.profiles.nama.charAt(0) : 'P'}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.assigneeName}>
                          {ta.profiles?.nama || 'Pegawai'}
                        </Text>
                        <Text style={styles.assigneeSpec}>
                          {ta.profiles?.spesialisasi || 'Pegawai'}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Jadwal & Batas Waktu */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Calendar size={15} color="#4F46E5" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Jadwal & Batas Waktu</Text>
              </View>
              <View style={styles.dateRow}>
                <Text style={styles.dateLabel}>Deadline:</Text>
                <Text style={styles.dateValue}>{formatDate(task.deadline)}</Text>
              </View>
              {task.tanggal_mulai && (
                <View style={[styles.dateRow, { marginTop: 4 }]}>
                  <Text style={styles.dateLabel}>Mulai:</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(task.tanggal_mulai)}
                  </Text>
                </View>
              )}
            </View>

            {/* Deskripsi */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <FileText size={15} color="#4F46E5" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Deskripsi / Instruksi</Text>
              </View>
              <Text style={styles.descriptionText}>
                {task.deskripsi || 'Tidak ada instruksi khusus.'}
              </Text>
            </View>

            {/* Spesifikasi Teknis */}
            {Object.keys(specs).length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Settings size={15} color="#4F46E5" style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Spesifikasi Teknis</Text>
                </View>
                {specs.durasi && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Durasi:</Text>
                    <Text style={styles.specVal}>{specs.durasi}</Text>
                  </View>
                )}
                {specs.resolusi && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Resolusi:</Text>
                    <Text style={styles.specVal}>{specs.resolusi}</Text>
                  </View>
                )}
                {specs.rasio && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Rasio Video:</Text>
                    <Text style={styles.specVal}>{specs.rasio}</Text>
                  </View>
                )}
                {specs.ukuran && (
                  <View style={styles.specRow}>
                    <Text style={styles.specKey}>Ukuran Desain:</Text>
                    <Text style={styles.specVal}>{specs.ukuran}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Link Referensi & Link Hasil */}
            {(task.link_referensi || task.link_hasil) && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Tautan Berkas</Text>
                {task.link_referensi && (
                  <TouchableOpacity
                    style={styles.linkRow}
                    onPress={() => openUrl(task.link_referensi!)}
                  >
                    <ExternalLink size={14} color="#1737D6" style={{ marginRight: 6 }} />
                    <Text style={styles.linkText} numberOfLines={1}>
                      Buka Link Referensi / Materi
                    </Text>
                  </TouchableOpacity>
                )}
                {task.link_hasil && (
                  <TouchableOpacity
                    style={[styles.linkRow, { marginTop: 8 }]}
                    onPress={() => openUrl(task.link_hasil!)}
                  >
                    <ExternalLink size={14} color="#16A34A" style={{ marginRight: 6 }} />
                    <Text style={[styles.linkText, { color: '#16A34A' }]} numberOfLines={1}>
                      Buka Link Hasil Pekerjaan
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Quick Status Action */}
            <View style={styles.actionSection}>
              <Text style={styles.actionSectionTitle}>Perbarui Status Pengerjaan</Text>
              {updating ? (
                <ActivityIndicator color="#1737D6" style={{ marginVertical: 12 }} />
              ) : (
                <View style={styles.actionButtonsRow}>
                  {task.status !== 'Sedang Dikerjakan' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnBlue]}
                      onPress={() => handleUpdateStatus('Sedang Dikerjakan')}
                    >
                      <PlayCircle size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>Kerjakan</Text>
                    </TouchableOpacity>
                  )}
                  {task.status !== 'Menunggu Review' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnPurple]}
                      onPress={() => handleUpdateStatus('Menunggu Review')}
                    >
                      <Eye size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>Ajukan Review</Text>
                    </TouchableOpacity>
                  )}
                  {task.status !== 'Selesai' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnGreen]}
                      onPress={() => handleUpdateStatus('Selesai')}
                    >
                      <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>Tandai Selesai</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  categoryText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 24,
    marginBottom: 10,
  },
  statusDeadlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionIcon: {
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  assigneesList: {
    gap: 8,
    marginTop: 4,
  },
  assigneeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assigneeInitialCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  assigneeInitialText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1737D6',
  },
  assigneeName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  assigneeSpec: {
    fontSize: 11,
    color: '#64748B',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 4,
  },
  dateValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  specKey: {
    fontSize: 12,
    color: '#64748B',
  },
  specVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  linkText: {
    fontSize: 13,
    color: '#1737D6',
    fontWeight: '600',
    flex: 1,
  },
  actionSection: {
    marginTop: 6,
    marginBottom: 20,
  },
  actionSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 10,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionBtn: {
    flex: 1,
    minWidth: 100,
    flexDirection: 'row',
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnBlue: {
    backgroundColor: '#1737D6',
  },
  actionBtnPurple: {
    backgroundColor: '#7E22CE',
  },
  actionBtnGreen: {
    backgroundColor: '#16A34A',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
