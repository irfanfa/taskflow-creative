'use client';

import React, { useState } from 'react';
import type { TaskSubtask } from '@/types/database';
import { addSubtask, toggleSubtask, deleteSubtask } from '@/app/actions/collaboration';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
  ListTodo,
  Sparkles,
} from 'lucide-react';

interface TaskSubtasksProps {
  taskId: string;
  initialSubtasks: TaskSubtask[];
  canEdit?: boolean;
}

export function TaskSubtasks({
  taskId,
  initialSubtasks,
  canEdit = true,
}: TaskSubtasksProps) {
  const [subtasks, setSubtasks] = useState<TaskSubtask[]>(initialSubtasks);
  const [newTitle, setNewTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setSubtasks(initialSubtasks);
  }, [initialSubtasks]);

  const completedCount = subtasks.filter((s) => s.is_completed).length;
  const totalCount = subtasks.length;
  const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const handleToggle = async (subtask: TaskSubtask) => {
    if (!canEdit) return;
    const targetStatus = !subtask.is_completed;

    // Optimistic update
    setSubtasks((prev) =>
      prev.map((s) =>
        s.id === subtask.id ? { ...s, is_completed: targetStatus } : s
      )
    );

    setTogglingId(subtask.id);
    const res = await toggleSubtask({
      subtaskId: subtask.id,
      taskId,
      isCompleted: targetStatus,
    });
    setTogglingId(null);

    if (!res.success) {
      // Revert if error
      setSubtasks((prev) =>
        prev.map((s) =>
          s.id === subtask.id ? { ...s, is_completed: subtask.is_completed } : s
        )
      );
      setErrorMsg(res.error || 'Gagal mengubah status checklist.');
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsAdding(true);
    setErrorMsg(null);
    const titleToAdd = newTitle.trim();
    const res = await addSubtask({
      taskId,
      judul: titleToAdd,
    });
    setIsAdding(false);

    if (res.success && res.subtaskId) {
      const newSubtaskObj: TaskSubtask = {
        id: res.subtaskId,
        task_id: taskId,
        judul: titleToAdd,
        is_completed: false,
        urutan: subtasks.length,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      setSubtasks((prev) => [...prev, newSubtaskObj]);
      setNewTitle('');
    } else {
      setErrorMsg(res.error || 'Gagal menambahkan checklist.');
    }
  };

  const handleQuickAdd = async (title: string) => {
    if (isAdding) return;
    setIsAdding(true);
    setErrorMsg(null);
    const res = await addSubtask({
      taskId,
      judul: title,
    });
    setIsAdding(false);

    if (res.success && res.subtaskId) {
      const newSubtaskObj: TaskSubtask = {
        id: res.subtaskId,
        task_id: taskId,
        judul: title,
        is_completed: false,
        urutan: subtasks.length,
        completed_at: null,
        created_at: new Date().toISOString(),
      };
      setSubtasks((prev) => [...prev, newSubtaskObj]);
    } else {
      setErrorMsg(res.error || 'Gagal menambahkan checklist.');
    }
  };

  const handleDelete = async (subtaskId: string) => {
    if (!confirm('Hapus tahapan checklist ini?')) return;

    setDeletingId(subtaskId);
    const res = await deleteSubtask({ subtaskId, taskId });
    setDeletingId(null);

    if (res.success) {
      setSubtasks((prev) => prev.filter((s) => s.id !== subtaskId));
    } else {
      setErrorMsg(res.error || 'Gagal menghapus checklist.');
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Tahapan Pengerjaan (Checklist)
            </CardTitle>
            <p className="text-xs text-slate-500">
              Pantau progres langkah kerja dari brief hingga final export
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
              {completedCount} / {totalCount} ({percentage}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-3">
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                percentage === 100
                  ? 'bg-emerald-500'
                  : percentage > 50
                  ? 'bg-indigo-600'
                  : 'bg-amber-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <p className="text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {errorMsg}
          </p>
        )}

        {/* List of subtasks */}
        {subtasks.length === 0 ? (
          <div className="py-6 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <ListTodo className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-600">Belum ada tahapan pengerjaan</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tambahkan tahapan kerja di bawah ini untuk memantau progres secara terstruktur.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {subtasks.map((subtask) => {
              const isBusy = togglingId === subtask.id || deletingId === subtask.id;
              return (
                <div
                  key={subtask.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    subtask.is_completed
                      ? 'bg-slate-50/80 dark:bg-slate-950/60 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-500 text-slate-800 dark:text-slate-100'
                  }`}
                >
                  <button
                    type="button"
                    disabled={!canEdit || isBusy}
                    onClick={() => handleToggle(subtask)}
                    className="flex items-center gap-3 text-left flex-1 min-w-0"
                  >
                    {togglingId === subtask.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
                    ) : subtask.is_completed ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 shrink-0 hover:text-indigo-600" />
                    )}
                    <span
                      className={`text-xs font-medium truncate ${
                        subtask.is_completed
                          ? 'line-through text-slate-400'
                          : 'text-slate-800'
                      }`}
                    >
                      {subtask.judul}
                    </span>
                  </button>

                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subtask.id)}
                      disabled={isBusy}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600"
                    >
                      {deletingId === subtask.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Input Add Subtask */}
        {canEdit && (
          <form onSubmit={handleAdd} className="flex gap-2 pt-1">
            <Input
              type="text"
              placeholder="Contoh: Rough Cut, Color Grading, Subtitle, Export..."
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="text-xs h-9"
              disabled={isAdding}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isAdding || !newTitle.trim()}
              className="h-9 px-3 bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs shrink-0"
            >
              {isAdding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              Tambah
            </Button>
          </form>
        )}

        {/* Template Quick Add Chips */}
        {canEdit && (
          <div className="pt-1">
            <p className="text-[11px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Template Tahapan Cepat:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Rough Cut',
                'Color Grading',
                'Sound Design / Subtitle',
                'Final Render & Export',
                'Draft Desain',
                'Pilih Aset & Font',
                'Revisi Catatan Admin',
              ].map((template) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => handleQuickAdd(template)}
                  disabled={isAdding}
                  className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200/80 transition-colors"
                >
                  + {template}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
