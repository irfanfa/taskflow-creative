'use client';

import React from 'react';
import type { TaskActivity } from '@/types/database';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';
import {
  History,
  CheckCircle2,
  RotateCcw,
  Send,
  CheckSquare,
  Paperclip,
  Clock,
  MessageSquare,
  Edit,
  UserCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';

interface TaskActivityTimelineProps {
  activities: TaskActivity[];
}

export function TaskActivityTimeline({ activities }: TaskActivityTimelineProps) {
  const getActivityIcon = (actionType: string) => {
    switch (actionType) {
      case 'review_approved':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'review_revision':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'submit_review':
        return <Send className="w-4 h-4 text-blue-600" />;
      case 'subtask_created':
      case 'subtask_toggled':
        return <CheckSquare className="w-4 h-4 text-purple-600" />;
      case 'attachment_uploaded':
      case 'attachment_deleted':
        return <Paperclip className="w-4 h-4 text-cyan-600" />;
      case 'timer_started':
      case 'timer_stopped':
      case 'time_logged_manual':
      case 'timer_auto_stopped':
        return <Clock className="w-4 h-4 text-indigo-600" />;
      case 'comment_added':
        return <MessageSquare className="w-4 h-4 text-slate-600" />;
      case 'deadline_changed':
        return <Calendar className="w-4 h-4 text-rose-600" />;
      case 'assignee_changed':
        return <UserCheck className="w-4 h-4 text-teal-600" />;
      default:
        return <Edit className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityBadgeColor = (actionType: string) => {
    switch (actionType) {
      case 'review_approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'review_revision':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'submit_review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'subtask_toggled':
      case 'subtask_created':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'attachment_uploaded':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'timer_started':
      case 'timer_stopped':
      case 'time_logged_manual':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <Card className="rounded-2xl border-slate-200/80 shadow-xs">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Riwayat &amp; Log Aktivitas
            </CardTitle>
            <p className="text-xs text-slate-500">
              Linimasa lengkap perubahan status, review, checklist, dan revisi
            </p>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {activities.length} aktivitas
          </span>
        </div>
      </CardHeader>

      <CardContent>
        {activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 italic">
            Belum ada aktivitas tercatat pada tugas ini.
          </div>
        ) : (
          <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((act) => {
              const dateStr = new Date(act.created_at).toLocaleDateString(
                'id-ID',
                {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }
              );

              return (
                <div key={act.id} className="relative group">
                  {/* Timeline bullet dot */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-500 flex items-center justify-center shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                  </div>

                  <div className="p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 transition-all text-xs space-y-1">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0">
                          {getActivityIcon(act.action_type)}
                        </div>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {act.user?.nama || 'Sistem / Pengguna'}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-400">
                        {dateStr} WIB
                      </span>
                    </div>

                    <p className="text-slate-700 pl-8 leading-relaxed">
                      {act.description}
                    </p>

                    {(act.old_value || act.new_value) && (
                      <div className="pl-8 pt-1 flex items-center gap-2 text-[11px] text-slate-500">
                        {act.old_value && (
                          <span className="line-through text-slate-400">
                            {act.old_value}
                          </span>
                        )}
                        {act.old_value && act.new_value && <span>&rarr;</span>}
                        {act.new_value && (
                          <span className="font-semibold text-slate-800">
                            {act.new_value}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
