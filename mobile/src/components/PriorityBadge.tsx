import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority } from '../types/database';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getColors = () => {
    switch (priority) {
      case 'Urgent':
        return { bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' };
      case 'Tinggi':
        return { bg: '#FFF7ED', text: '#EA580C', border: '#FDBA74' };
      case 'Sedang':
        return { bg: '#EFF6FF', text: '#2563EB', border: '#93C5FD' };
      case 'Rendah':
      default:
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
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
      <Text style={[styles.text, { color: colors.text }]}>{priority}</Text>
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
    fontWeight: '700',
  },
});
