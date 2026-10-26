import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/auth-context';
import { Profile, TaskPriority } from '../types/database';
import { PlusCircle, Calendar, Briefcase, FileText, CheckCircle2 } from 'lucide-react-native';

export function CreateTaskScreen({ onTaskCreated }: { onTaskCreated?: () => void }) {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const [judul, setJudul] = useState('');
  const [klien, setKlien] = useState('');
  const [jenisPekerjaan, setJenisPekerjaan] = useState('Desain E-Flyer');
  const [prioritas, setPrioritas] = useState<TaskPriority>('Sedang');
  const [deadlineDays, setDeadlineDays] = useState(3);
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEmployees = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'pegawai')
        .is('deleted_at', null)
        .order('nama', { ascending: true });

      if (data) setEmployees(data as Profile[]);
    };
    fetchEmployees();
  }, []);

  const handleCreateTask = async () => {
    if (!judul.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan judul tugas.');
      return;
    }

    setLoading(true);
    try {
      const deadlineDate = new Date();
      deadlineDate.setDate(deadlineDate.getDate() + deadlineDays);

      // 1. Insert into tasks table
      const { data: newTask, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          judul: judul.trim(),
          klien_proyek: klien.trim() || 'Internal Instansi',
          jenis_pekerjaan: jenisPekerjaan,
          prioritas,
          deadline: deadlineDate.toISOString(),
          tanggal_mulai: new Date().toISOString(),
          status: 'Belum Dimulai',
          deskripsi: deskripsi.trim() || null,
          created_by: profile?.id || null,
        })
        .select()
        .single();

      if (taskErr) throw taskErr;

      // 2. Insert into task_assignees if assignee selected
      if (newTask && selectedAssignee) {
        await supabase.from('task_assignees').insert({
          task_id: newTask.id,
          user_id: selectedAssignee,
        });
      }

      Alert.alert('Sukses', 'Tugas baru berhasil dibuat dan ditugaskan!');
      setJudul('');
      setKlien('');
      setDeskripsi('');
      setSelectedAssignee('');
      if (onTaskCreated) onTaskCreated();
    } catch (err: any) {
      Alert.alert('Gagal Membuat Tugas', err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const jenisList = ['Desain E-Flyer', 'Video Editing', 'Motion Graphic', 'Desain Banner'];
  const priorityList: TaskPriority[] = ['Rendah', 'Sedang', 'Tinggi', 'Urgent'];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buat Tugas Baru</Text>
        <Text style={styles.headerSubtitle}>
          Formulir penugasan kerja untuk tim kreatif
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Judul Tugas */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Judul Tugas *</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: E-Flyer Dialog Interaktif Pagi"
            placeholderTextColor="#94A3B8"
            value={judul}
            onChangeText={setJudul}
          />
        </View>

        {/* Klien / Program */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Klien / Program Siaran</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Pro 1 RRI Surabaya"
            placeholderTextColor="#94A3B8"
            value={klien}
            onChangeText={setKlien}
          />
        </View>

        {/* Jenis Pekerjaan */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Jenis Pekerjaan</Text>
          <View style={styles.optionsRow}>
            {jenisList.map((j) => (
              <TouchableOpacity
                key={j}
                style={[
                  styles.optionChip,
                  jenisPekerjaan === j && styles.optionChipActive,
                ]}
                onPress={() => setJenisPekerjaan(j)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    jenisPekerjaan === j && styles.optionChipTextActive,
                  ]}
                >
                  {j}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Prioritas */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Prioritas</Text>
          <View style={styles.optionsRow}>
            {priorityList.map((p) => (
              <TouchableOpacity
                key={p}
                style={[
                  styles.optionChip,
                  prioritas === p && styles.optionChipActive,
                ]}
                onPress={() => setPrioritas(p)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    prioritas === p && styles.optionChipTextActive,
                  ]}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deadline Target */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Batas Waktu Pengerjaan (Deadline)</Text>
          <View style={styles.optionsRow}>
            {[1, 2, 3, 5, 7].map((d) => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.optionChip,
                  deadlineDays === d && styles.optionChipActive,
                ]}
                onPress={() => setDeadlineDays(d)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    deadlineDays === d && styles.optionChipTextActive,
                  ]}
                >
                  {d === 1 ? '1 Hari (Besok)' : `${d} Hari`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Assignee Selection (If Admin) */}
        {employees.length > 0 && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tugaskan Kepada Pegawai</Text>
            <View style={styles.assigneeOptions}>
              {employees.map((emp) => (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.empOption,
                    selectedAssignee === emp.id && styles.empOptionSelected,
                  ]}
                  onPress={() =>
                    setSelectedAssignee(selectedAssignee === emp.id ? '' : emp.id)
                  }
                >
                  <Text
                    style={[
                      styles.empName,
                      selectedAssignee === emp.id && styles.empNameSelected,
                    ]}
                  >
                    {emp.nama}
                  </Text>
                  <Text style={styles.empSpec}>
                    {emp.spesialisasi || 'Pegawai'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Deskripsi */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Deskripsi & Instruksi Brief</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tuliskan catatan brief, narasumber, atau instruksi materi..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={deskripsi}
            onChangeText={setDeskripsi}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          onPress={handleCreateTask}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <PlusCircle size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>Simpan & Terbitkan Tugas</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionChipActive: {
    backgroundColor: '#1737D6',
    borderColor: '#1737D6',
  },
  optionChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  assigneeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  empOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  empOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#1737D6',
  },
  empName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  empNameSelected: {
    color: '#1737D6',
  },
  empSpec: {
    fontSize: 11,
    color: '#64748B',
  },
  submitBtn: {
    flexDirection: 'row',
    backgroundColor: '#1737D6',
    borderRadius: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#1737D6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
