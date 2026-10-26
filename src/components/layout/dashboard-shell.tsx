'use client';

import React, { useState } from 'react';
import type { Profile } from '@/types/database';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { RealtimeTaskNotificationListener } from '@/components/notifications/realtime-task-notification-listener';

interface DashboardShellProps {
  profile: Profile;
  children: React.ReactNode;
}

export function DashboardShell({ profile, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
      {/* Realtime Push & Local Notification Listener */}
      <RealtimeTaskNotificationListener profile={profile} />

      {/* Sidebar (Desktop fixed & Mobile drawer) */}
      <Sidebar
        role={profile.role}
        profile={profile}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-hidden">
        <Header
          profile={profile}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />

        <main className="flex-1 min-w-0 max-w-full overflow-y-auto overflow-x-hidden p-3.5 sm:p-6 md:p-8">
          <div className="mx-auto max-w-7xl w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
