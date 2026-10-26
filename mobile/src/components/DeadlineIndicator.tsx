import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Clock, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react-native';

interface DeadlineIndicatorProps {
  deadline: string;
  isCompleted?: boolean;
}

export function DeadlineIndicator({
  deadline,
  isCompleted = false,
}: DeadlineIndicatorProps) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const formattedDate = deadlineDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';

  if (isCompleted) {
    return (
      <View style={[styles.container, styles.bgEmerald]}>
        <CheckCircle2 size={12} color="#15803D" style={styles.icon} />
        <Text style={[styles.text, styles.textEmerald]}>Selesai Tuntas</Text>
      </View>
    );
  }

  // Overdue (Terlambat)
  if (diffMs < 0) {
    const overdueDays = Math.abs(diffDays);
    const overdueHours = Math.abs(diffHours);
    const timeText = overdueDays > 1 ? `${overdueDays} hari lalu` : `${overdueHours} jam lalu`;

    return (
      <View style={[styles.container, styles.bgRose]}>
        <AlertTriangle size={12} color="#BE123C" style={styles.icon} />
        <Text style={[styles.text, styles.textRose]}>
          Lewat: {timeText}
        </Text>
      </View>
    );
  }

  // Mendekati deadline (<= 3 hari)
  if (diffDays <= 3) {
    const timeText = diffDays === 1 ? 'Hari Ini' : `${diffDays} hari lagi`;
    return (
      <View style={[styles.container, styles.bgAmber]}>
        <AlertCircle size={12} color="#B45309" style={styles.icon} />
        <Text style={[styles.text, styles.textAmber]}>
          {timeText} ({formattedDate})
        </Text>
      </View>
    );
  }

  // Normal deadline
  return (
    <View style={styles.container}>
      <Clock size={12} color="#64748B" style={styles.icon} />
      <Text style={styles.text}>{formattedDate}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  bgEmerald: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  textEmerald: {
    color: '#15803D',
  },
  bgRose: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  textRose: {
    color: '#BE123C',
    fontWeight: '700',
  },
  bgAmber: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  textAmber: {
    color: '#B45309',
    fontWeight: '700',
  },
});
