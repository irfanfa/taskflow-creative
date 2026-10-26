import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskPriority } from '../types/database';
import { Flame, ArrowUp, Minus, ArrowDown } from 'lucide-react-native';

interface PriorityBadgeProps {
  priority: TaskPriority;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const getBadgeConfig = () => {
    switch (priority) {
      case 'Urgent':
        return {
          label: 'Urgent',
          bg: '#FFF1F2',
          text: '#BE123C',
          border: '#FECDD3',
          icon: <Flame size={11} color="#BE123C" style={styles.icon} />,
        };
      case 'Tinggi':
        return {
          label: 'Tinggi',
          bg: '#FFFBEB',
          text: '#B45309',
          border: '#FDE68A',
          icon: <ArrowUp size={11} color="#B45309" style={styles.icon} />,
        };
      case 'Sedang':
        return {
          label: 'Sedang',
          bg: '#EFF6FF',
          text: '#1D4ED8',
          border: '#BFDBFE',
          icon: <Minus size={11} color="#1D4ED8" style={styles.icon} />,
        };
      case 'Rendah':
      default:
        return {
          label: 'Rendah',
          bg: '#F8FAFC',
          text: '#475569',
          border: '#E2E8F0',
          icon: <ArrowDown size={11} color="#475569" style={styles.icon} />,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
      ]}
    >
      {config.icon}
      <Text style={[styles.text, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
