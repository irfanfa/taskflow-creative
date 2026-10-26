import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskStatus } from '../types/database';

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getColors = () => {
    switch (status) {
      case 'Dalam Antrean':
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
      case 'Belum Dimulai':
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
      case 'Sedang Dikerjakan':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'Menunggu Review':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'Revisi':
        return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
      case 'Selesai':
        return { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const colors = getColors();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
