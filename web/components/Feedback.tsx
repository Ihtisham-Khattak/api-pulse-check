'use client';

import { CircleCheck, TriangleAlert, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

interface ToastItem { id: number; text: string; kind: 'info' | 'error' }
interface ConfirmOptions { title: string; body: string; confirmLabel?: string; danger?: boolean }

interface FeedbackApi {
  toast: (text: string, kind?: 'info' | 'error') => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be used inside FeedbackProvider');
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dialog, setDialog] = useState<ConfirmOptions | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const nextId = useRef(1);

  const toast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const id = nextId.current++;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 5200 : 2800);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setDialog(options);
    });
  }, []);

  useEffect(() => {
    if (dialog && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [dialog]);

  const close = (ok: boolean) => {
    dialogRef.current?.close();
    setDialog(null);
    resolver.current?.(ok);
    resolver.current = null;
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}

      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div className="toast" key={t.id}>
            {t.kind === 'error' ? <TriangleAlert size={18} aria-hidden="true" /> : <CircleCheck size={18} aria-hidden="true" />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      <dialog ref={dialogRef} onCancel={(e) => { e.preventDefault(); close(false); }} aria-labelledby="dlg-title">
        {dialog && (
          <div>
            <h2 id="dlg-title"><TriangleAlert size={20} aria-hidden="true" /> {dialog.title}</h2>
            <p>{dialog.body}</p>
            <div className="dlg-actions">
              <button className="btn" type="button" onClick={() => close(false)}><X size={16} aria-hidden="true" /> Cancel</button>
              <button className={`btn ${dialog.danger ? 'danger' : 'primary'}`} type="button" onClick={() => close(true)}>
                {dialog.confirmLabel ?? 'Continue'}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </FeedbackContext.Provider>
  );
}
