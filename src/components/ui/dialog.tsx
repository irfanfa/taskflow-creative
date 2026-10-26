'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DialogContextValue {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext() {
  return React.useContext(DialogContext);
}

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children, className }: DialogProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <DialogContext.Provider value={{ open, onOpenChange }}>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs transition-opacity animate-in fade-in-50"
          onClick={() => onOpenChange(false)}
        />
        <div
          className={cn(
            'relative z-50 w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-6 shadow-2xl transition-all animate-in zoom-in-95 border border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto',
            className
          )}
        >
          {children}
        </div>
      </div>
    </DialogContext.Provider>,
    document.body
  );
}

export function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col space-y-1.5 text-left mb-4', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-lg font-bold leading-none tracking-tight text-slate-900 dark:text-slate-100',
        className
      )}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  as: Component = 'div',
  ...props
}: React.HTMLAttributes<HTMLElement> & { as?: 'div' | 'p' }) {
  return (
    <Component
      className={cn('text-sm text-slate-500 dark:text-slate-400 leading-relaxed', className)}
      {...props}
    />
  );
}

export function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800',
        className
      )}
      {...props}
    />
  );
}

export interface DialogCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function DialogClose({
  asChild,
  onClose,
  children,
  className,
  onClick,
  ...props
}: DialogCloseProps) {
  const ctx = useDialogContext();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) onClick(e);
    if (onClose) onClose();
    if (ctx) ctx.onOpenChange(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
        const childProps = (children as React.ReactElement<any>).props;
        if (childProps?.onClick) childProps.onClick(e);
        handleClick(e);
      },
    });
  }

  if (children) {
    return (
      <button
        type="button"
        onClick={handleClick}
        className={cn('cursor-pointer', className)}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors',
        className
      )}
      aria-label="Tutup dialog"
      {...props}
    >
      <X className="h-5 w-5" />
    </button>
  );
}

export function DialogContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
    </div>
  );
}
