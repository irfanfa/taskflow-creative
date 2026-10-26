import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Task } from '../types/database';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import { Calendar, Briefcase, ChevronRight } from 'lucide-react-native';

interface TaskCardProps {
  task: Task;
  onPress: (task: Task) => void;
}

export function TaskCard({ task, onPress }: TaskCardProps) {
  const formatDeadline = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const isOverdue =
    new Date(task.deadline).getTime() < Date.now() &&
    task.status !== 'Selesai';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => onPress(task)}
    >
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{task.jenis_pekerjaan}</Text>
        </View>
        <PriorityBadge priority={task.prioritas} />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {task.judul}
      </Text>

      <View style={styles.infoRow}>
        <Briefcase size={14} color="#64748B" style={styles.icon} />
        <Text style={styles.clientText} numberOfLines={1}>
          {task.klien_proyek || 'Internal'}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Calendar
          size={14}
          color={isOverdue ? '#DC2626' : '#64748B'}
          style={styles.icon}
        />
        <Text
          style={[styles.deadlineText, isOverdue && styles.overdueText]}
          numberOfLines={1}
        >
          {formatDeadline(task.deadline)}
          {isOverdue ? ' (Terlambat)' : ''}
        </Text>
      </View>

      <View style={styles.footerRow}>
        <StatusBadge status={task.status} />
        <View style={styles.detailButton}>
          <Text style={styles.detailText}>Detail</Text>
          <ChevronRight size={14} color="#1737D6" />
        </View>
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
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
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
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 6,
  },
  clientText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  deadlineText: {
    fontSize: 12,
    color: '#64748B',
  },
  overdueText: {
    color: '#DC2626',
    fontWeight: '600',
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
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1737D6',
    marginRight: 2,
  },
});
