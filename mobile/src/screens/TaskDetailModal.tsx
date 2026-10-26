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
} from 'react-native';
import { Task, TaskStatus } from '../types/database';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { supabase } from '../lib/supabase';
import {
  X,
  Calendar,
  Briefcase,
  FileText,
  Settings,
  Clock,
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
      });
    } catch {
      return dateStr;
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('tugas')
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

  const specs = task.spesifikasi_teknis || {};

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
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
            {/* Title & Status */}
            <Text style={styles.title}>{task.judul}</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status Saat Ini:</Text>
              <StatusBadge status={task.status} />
            </View>

            {/* Client Info */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Briefcase size={16} color="#1737D6" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Klien / Proyek</Text>
              </View>
              <Text style={styles.sectionText}>
                {task.klien_proyek || 'Program Internal RRI'}
              </Text>
            </View>

            {/* Timeline Info */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Calendar size={16} color="#1737D6" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Jadwal & Deadline</Text>
              </View>
              <View style={styles.dateRow}>
                <Clock size={14} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.dateLabel}>Deadline:</Text>
                <Text style={styles.dateValue}>{formatDate(task.deadline)}</Text>
              </View>
              {task.tanggal_mulai && (
                <View style={[styles.dateRow, { marginTop: 4 }]}>
                  <Clock size={14} color="#64748B" style={{ marginRight: 6 }} />
                  <Text style={styles.dateLabel}>Mulai:</Text>
                  <Text style={styles.dateValue}>
                    {formatDate(task.tanggal_mulai)}
                  </Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <FileText size={16} color="#1737D6" style={styles.sectionIcon} />
                <Text style={styles.sectionTitle}>Deskripsi / Instruksi</Text>
              </View>
              <Text style={styles.descriptionText}>
                {task.deskripsi || 'Tidak ada deskripsi rincian tugas.'}
              </Text>
            </View>

            {/* Technical Specs */}
            {Object.keys(specs).length > 0 && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <Settings
                    size={16}
                    color="#1737D6"
                    style={styles.sectionIcon}
                  />
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
                    <Text style={styles.specKey}>Aspek Rasio:</Text>
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

            {/* Quick Actions */}
            <View style={styles.actionSection}>
              <Text style={styles.actionSectionTitle}>Perbarui Status Tugas</Text>
              {updating ? (
                <ActivityIndicator
                  color="#1737D6"
                  style={{ marginVertical: 12 }}
                />
              ) : (
                <View style={styles.actionButtonsRow}>
                  {task.status !== 'Sedang Dikerjakan' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnBlue]}
                      onPress={() => handleUpdateStatus('Sedang Dikerjakan')}
                    >
                      <Text style={styles.actionBtnText}>Kerjakan</Text>
                    </TouchableOpacity>
                  )}
                  {task.status !== 'Menunggu Review' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnAmber]}
                      onPress={() => handleUpdateStatus('Menunggu Review')}
                    >
                      <Text style={styles.actionBtnText}>Ajukan Review</Text>
                    </TouchableOpacity>
                  )}
                  {task.status !== 'Selesai' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionBtnGreen]}
                      onPress={() => handleUpdateStatus('Selesai')}
                    >
                      <CheckCircle2 size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      <Text style={styles.actionBtnText}>Selesai</Text>
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
    maxHeight: '85%',
    paddingBottom: 24,
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
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#4F46E5',
    fontSize: 12,
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
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusLabel: {
    fontSize: 13,
    color: '#64748B',
    marginRight: 8,
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
  },
  sectionText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 4,
  },
  dateValue: {
    fontSize: 12,
    color: '#0F172A',
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
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnBlue: {
    backgroundColor: '#1737D6',
  },
  actionBtnAmber: {
    backgroundColor: '#D97706',
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
