import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task } from '../types/database';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { DeadlineIndicator } from './DeadlineIndicator';
import { Briefcase, User as UserIcon, ChevronRight } from 'lucide-react-native';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  // First assignee name if any
  const firstAssignee = task.task_assignees?.[0]?.profiles?.nama;
  const extraAssigneesCount = (task.task_assignees?.length || 0) - 1;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(task)}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.badgeGroup}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{task.jenis_pekerjaan}</Text>
          </View>
          {task.revision_count !== undefined && task.revision_count > 0 && (
            <View style={styles.revisionBadge}>
              <Text style={styles.revisionText}>
                Revisi #{task.revision_count}
              </Text>
            </View>
          )}
        </View>
        <PriorityBadge priority={task.prioritas} />
      </View>

      {/* Task Title */}
      <Text style={styles.title} numberOfLines={2}>
        {task.judul}
      </Text>

      {/* Client Info */}
      <View style={styles.infoRow}>
        <Briefcase size={13} color="#64748B" style={styles.icon} />
        <Text style={styles.infoLabel}>Klien:</Text>
        <Text style={styles.infoValue} numberOfLines={1}>
          {task.klien_proyek || 'Internal Instansi'}
        </Text>
      </View>

      {/* Assignee Info (if present) */}
      {firstAssignee && (
        <View style={styles.infoRow}>
          <UserIcon size={13} color="#64748B" style={styles.icon} />
          <Text style={styles.infoLabel}>Petugas:</Text>
          <Text style={styles.infoValue} numberOfLines={1}>
            {firstAssignee}
            {extraAssigneesCount > 0 ? ` +${extraAssigneesCount}` : ''}
          </Text>
        </View>
      )}

      {/* Footer Row: Status & Deadline */}
      <View style={styles.footerRow}>
        <StatusBadge status={task.status} />
        <DeadlineIndicator
          deadline={task.deadline}
          isCompleted={task.status === 'Selesai'}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  revisionBadge: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  revisionText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 21,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  icon: {
    marginRight: 5,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
});
