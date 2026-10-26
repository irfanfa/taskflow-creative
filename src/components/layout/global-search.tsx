'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { globalSearch, type GlobalSearchResult } from '@/app/actions/search';
import type { UserRole } from '@/types/database';
import { Avatar } from '@/components/ui/avatar';
import { StatusBadge } from '@/components/tasks/status-badge';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import {
  Search,
  CheckSquare,
  Users,
  Briefcase,
  Loader2,
  X,
  ArrowRight,
  Command,
  CornerDownLeft,
  ArrowUpDown,
} from 'lucide-react';

interface GlobalSearchProps {
  role: UserRole;
}

type NavigableItem =
  | { type: 'task'; id: string; judul: string }
  | { type: 'employee'; id: string; nama: string }
  | { type: 'client'; name: string };

const QUICK_SEARCH_CHIPS = [
  'Desain Grafis',
  'Video Editing',
  'E-Flyer',
  'Sosialisasi',
  'Siaran',
  'Revisi',
];

export function GlobalSearch({ role }: GlobalSearchProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [results, setResults] = useState<GlobalSearchResult>({
    tasks: [],
    employees: [],
    clients: [],
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  // Set mounted flag for safe portal rendering
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K to toggle search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Focus input and reset when dialog opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 60);
      return () => clearTimeout(timer);
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setSelectedIndex(0);
      setResults({ tasks: [], employees: [], clients: [] });
    }
  }, [isOpen]);

  // Debounced live search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults({ tasks: [], employees: [], clients: [] });
      setIsLoading(false);
      setSelectedIndex(0);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Gagal melakukan pencarian:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timeout);
  }, [query]);

  // Flattened items for unified arrow key navigation
  const flatItems = useMemo<NavigableItem[]>(() => {
    const items: NavigableItem[] = [];
    results.tasks.forEach((t) => items.push({ type: 'task', id: t.id, judul: t.judul }));
    results.employees.forEach((e) => items.push({ type: 'employee', id: e.id, nama: e.nama }));
    results.clients
      .filter((c) => c.name !== 'Internal Instansi')
      .forEach((c) => items.push({ type: 'client', name: c.name }));
    return items;
  }, [results]);

  const handleSelectTask = useCallback(
    (taskId: string) => {
      setIsOpen(false);
      const path =
        role === 'admin'
          ? `/admin/tugas/${taskId}`
          : role === 'pep'
          ? `/pep/tugas/${taskId}`
          : role === 'sosmed'
          ? `/sosmed/tugas/${taskId}`
          : `/pegawai/tugas/${taskId}`;
      router.push(path);
    },
    [role, router]
  );

  const handleSelectEmployee = useCallback(
    (empId: string) => {
      setIsOpen(false);
      if (role === 'admin') {
        router.push(`/admin/pegawai?highlight=${empId}`);
      }
    },
    [role, router]
  );

  const handleSelectClient = useCallback((clientName: string) => {
    setQuery(clientName);
    inputRef.current?.focus();
  }, []);

  const handleExecuteSelected = useCallback(() => {
    if (flatItems.length === 0 || selectedIndex >= flatItems.length) return;
    const item = flatItems[selectedIndex];
    if (item.type === 'task') {
      handleSelectTask(item.id);
    } else if (item.type === 'employee') {
      handleSelectEmployee(item.id);
    } else if (item.type === 'client') {
      handleSelectClient(item.name);
    }
  }, [flatItems, selectedIndex, handleSelectTask, handleSelectEmployee, handleSelectClient]);

  // Keyboard navigation within the modal
  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (flatItems.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleExecuteSelected();
    }
  };

  const hasResults =
    results.tasks.length > 0 ||
    results.employees.length > 0 ||
    results.clients.length > 0;

  let currentNavIndex = -1;

  return (
    <>
      {/* Search trigger button in header */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center justify-center md:justify-start gap-2 p-2 md:px-3.5 md:py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 hover:bg-slate-100/90 dark:hover:bg-slate-800/90 hover:border-indigo-300 dark:hover:border-indigo-700 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-xs font-medium transition-all duration-150 h-9 w-9 md:w-56 lg:w-72 shadow-2xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 shrink-0"
        aria-label="Buka pencarian global"
        title="Pencarian Global (Ctrl+K)"
      >
        <Search className="w-4 h-4 md:w-3.5 md:h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
        <span className="truncate flex-1 text-left hidden md:inline">Cari tugas, staf...</span>
        <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-2xs">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      {/* Global Search Modal rendered directly into document.body */}
      {isOpen &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-9999 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4"
            onKeyDown={handleModalKeyDown}
          >
            {/* Backdrop Blur Overlay */}
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in-50 duration-150"
              onClick={() => setIsOpen(false)}
            />

            {/* Spotlight Search Card */}
            <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[82vh] transition-all animate-in zoom-in-95 duration-150">
              {/* Search Input Bar (Sticky at Top of Modal) */}
              <div className="flex items-center px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70 gap-3 shrink-0">
                <Search className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Ketik judul tugas, kategori, proyek, atau nama staf..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full text-sm sm:text-base bg-transparent outline-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium"
                />
                {isLoading && (
                  <Loader2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-spin shrink-0" />
                )}
                {query && !isLoading && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                    aria-label="Bersihkan pencarian"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md cursor-pointer transition-colors shadow-2xs"
                  title="Tekan Escape untuk menutup"
                >
                  ESC
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  aria-label="Tutup pencarian"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Results & Quick Discovery Scroll Area */}
              <div
                ref={resultsContainerRef}
                className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-4"
              >
                {/* 0. Empty State / Quick Discovery */}
                {!query.trim() && (
                  <div className="py-6 px-2 space-y-4">
                    <div className="text-center space-y-1.5">
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 mb-1">
                        <Search className="w-5 h-5" />
                      </div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Pusat Pencarian Cepat KMB Team Creative
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                        Ketik minimal 2 karakter untuk mencari judul tugas, jenis pekerjaan, proyek, atau nama staf tim pelaksana.
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Pencarian Populer:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {QUICK_SEARCH_CHIPS.map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              setQuery(chip);
                              inputRef.current?.focus();
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* No Results State */}
                {query.trim().length >= 2 && !isLoading && !hasResults && (
                  <div className="py-12 text-center space-y-2">
                    <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tidak ada hasil untuk &quot;{query}&quot;
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      Coba gunakan kata kunci lain seperti nama tugas, kategori desain, atau nama staf tim.
                    </p>
                  </div>
                )}

                {/* 1. Results: Kategori Tugas */}
                {results.tasks.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                      <CheckSquare className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Tugas ({results.tasks.length})</span>
                    </div>
                    <div className="space-y-1">
                      {results.tasks.map((task) => {
                        currentNavIndex++;
                        const isSelected = selectedIndex === currentNavIndex;
                        const thisIndex = currentNavIndex;

                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => handleSelectTask(task.id)}
                            onMouseEnter={() => setSelectedIndex(thisIndex)}
                            className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-800 shadow-2xs'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent'
                            }`}
                          >
                            <div className="min-w-0 pr-3">
                              <div
                                className={`text-xs sm:text-sm font-bold truncate transition-colors ${
                                  isSelected
                                    ? 'text-indigo-700 dark:text-indigo-300'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {task.judul}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 mt-1">
                                <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                  {task.jenis_pekerjaan}
                                </span>
                                {task.klien_proyek && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate max-w-[140px] text-slate-600 dark:text-slate-400">
                                      {task.klien_proyek}
                                    </span>
                                  </>
                                )}
                                <span>&bull;</span>
                                <span>Prioritas: {task.prioritas}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={task.status} />
                              <ArrowRight
                                className={`w-4 h-4 transition-transform ${
                                  isSelected
                                    ? 'text-indigo-600 dark:text-indigo-400 translate-x-0.5'
                                    : 'text-slate-300 dark:text-slate-600'
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Results: Kategori Pegawai */}
                {results.employees.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                      <Users className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" />
                      <span>Anggota Tim ({results.employees.length})</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {results.employees.map((emp) => {
                        currentNavIndex++;
                        const isSelected = selectedIndex === currentNavIndex;
                        const thisIndex = currentNavIndex;

                        return (
                          <button
                            key={emp.id}
                            type="button"
                            onClick={() => handleSelectEmployee(emp.id)}
                            onMouseEnter={() => setSelectedIndex(thisIndex)}
                            className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-teal-50/90 dark:bg-teal-950/70 border-teal-200 dark:border-teal-800 shadow-2xs'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border-transparent'
                            }`}
                          >
                            <Avatar
                              className="w-8 h-8 text-[11px] shrink-0"
                              src={emp.foto || undefined}
                              fallback={emp.nama.substring(0, 2).toUpperCase()}
                            />
                            <div className="min-w-0 flex-1">
                              <div
                                className={`text-xs font-bold truncate transition-colors ${
                                  isSelected
                                    ? 'text-teal-800 dark:text-teal-300'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {emp.nama}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1.5">
                                <span>{emp.spesialisasi || emp.role}</span>
                                <span>&bull;</span>
                                <span className="text-slate-400 dark:text-slate-500">{emp.email}</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Results: Kategori Proyek / Klien */}
                {results.clients.filter((c) => c.name !== 'Internal Instansi').length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-2">
                      <Briefcase className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <span>Proyek Terkait</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {results.clients
                        .filter((c) => c.name !== 'Internal Instansi')
                        .map((c) => {
                          currentNavIndex++;
                          const isSelected = selectedIndex === currentNavIndex;
                          const thisIndex = currentNavIndex;

                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => handleSelectClient(c.name)}
                              onMouseEnter={() => setSelectedIndex(thisIndex)}
                              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-amber-100 dark:bg-amber-950 border-amber-300 dark:border-amber-700 text-amber-950 dark:text-amber-200 shadow-2xs'
                                  : 'bg-amber-50/80 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                              }`}
                            >
                              <span>{c.name}</span>
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-200/80 dark:bg-amber-900/80 px-1.5 py-0.2 rounded-full font-semibold">
                                {c.taskCount} tugas
                              </span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Keyboard Hint Bar */}
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/90 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono inline-flex items-center justify-center">
                      <ArrowUpDown className="h-2.5 w-2.5" />
                    </kbd>{' '}
                    Navigasi
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono inline-flex items-center justify-center">
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </kbd>{' '}
                    Buka
                  </span>
                  <span className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-mono inline-flex items-center justify-center">
                      ESC
                    </kbd>{' '}
                    Tutup
                  </span>
                </div>
                {hasResults && (
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {flatItems.length} hasil ditemukan
                  </span>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
