import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TaskStatus } from '../types/database';
import {
  Clock,
  PlayCircle,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react-native';

interface StatusBadgeProps {
  status: TaskStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'Dalam Antrean':
      case 'Belum Dimulai':
        return {
          label: 'Dalam Antrean',
          bg: '#F1F5F9',
          text: '#334155',
          border: '#CBD5E1',
          icon: <Clock size={11} color="#334155" style={styles.icon} />,
        };
      case 'Sedang Dikerjakan':
        return {
          label: 'Sedang Dikerjakan',
          bg: '#EFF6FF',
          text: '#1D4ED8',
          border: '#BFDBFE',
          icon: <PlayCircle size={11} color="#1D4ED8" style={styles.icon} />,
        };
      case 'Menunggu Review':
        return {
          label: 'Menunggu Review',
          bg: '#FAF5FF',
          text: '#7E22CE',
          border: '#E9D5FF',
          icon: <Eye size={11} color="#7E22CE" style={styles.icon} />,
        };
      case 'Revisi':
        return {
          label: 'Perlu Revisi',
          bg: '#FFFBEB',
          text: '#B45309',
          border: '#FDE68A',
          icon: <AlertCircle size={11} color="#B45309" style={styles.icon} />,
        };
      case 'Selesai':
        return {
          label: 'Selesai',
          bg: '#F0FDF4',
          text: '#15803D',
          border: '#BBF7D0',
          icon: <CheckCircle2 size={11} color="#15803D" style={styles.icon} />,
        };
      default:
        return {
          label: status,
          bg: '#F1F5F9',
          text: '#475569',
          border: '#E2E8F0',
          icon: <Clock size={11} color="#475569" style={styles.icon} />,
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
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});
