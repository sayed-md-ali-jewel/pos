import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';

type DialogVariant = 'default' | 'danger';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}
interface PromptOptions extends ConfirmOptions {
  defaultValue?: string;
  placeholder?: string;
}
interface DialogContextValue {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
}

type ActiveDialog =
  | {
      type: 'confirm';
      options: ConfirmOptions;
      resolve: (value: boolean) => void;
    }
  | {
      type: 'prompt';
      options: PromptOptions;
      resolve: (value: string | null) => void;
    };

const AppDialogContext = createContext<DialogContextValue | null>(null);

export function AppDialogProvider({ children }: { children: ReactNode }) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null);
  const [promptValue, setPromptValue] = useState('');

  const normalizeConfirmOptions = (options: ConfirmOptions | string): ConfirmOptions =>
    typeof options === 'string' ? { message: options } : options;

  const normalizePromptOptions = (options: PromptOptions | string): PromptOptions =>
    typeof options === 'string' ? { message: options } : options;

  const value = useMemo<DialogContextValue>(
    () => ({
      confirm: (options) =>
        new Promise((resolve) => {
          setActiveDialog({
            type: 'confirm',
            options: normalizeConfirmOptions(options),
            resolve,
          });
        }),
      prompt: (options) =>
        new Promise((resolve) => {
          const normalizedOptions = normalizePromptOptions(options);
          setPromptValue(normalizedOptions.defaultValue || '');
          setActiveDialog({
            type: 'prompt',
            options: normalizedOptions,
            resolve,
          });
        }),
    }),
    []
  );

  const closeDialog = (result: boolean | string | null) => {
    if (!activeDialog) return;
    if (activeDialog.type === 'confirm') activeDialog.resolve(Boolean(result));
    if (activeDialog.type === 'prompt') {
      activeDialog.resolve(typeof result === 'string' ? result : null);
      setPromptValue('');
    }
    setActiveDialog(null);
  };

  const options = activeDialog?.options;
  const isDanger = options?.variant === 'danger';

  return (
    <AppDialogContext.Provider value={value}>
      {children}
      {activeDialog && options && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20">
            <div
              className={`h-1.5 ${
                isDanger ? 'bg-rose-500' : 'bg-gradient-to-r from-sky-500 to-indigo-500'
              }`}
            />
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-950">
                {options.title || (activeDialog.type === 'prompt' ? 'Input Required' : 'Confirm')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{options.message}</p>

              {activeDialog.type === 'prompt' && (
                <input
                  autoFocus
                  value={promptValue}
                  onChange={(event) => setPromptValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') closeDialog(promptValue);
                    if (event.key === 'Escape') closeDialog(null);
                  }}
                  placeholder={activeDialog.options.placeholder}
                  className="input-field mt-5 min-h-12"
                />
              )}
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                onClick={() => closeDialog(null)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                {options.cancelText || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => closeDialog(activeDialog.type === 'prompt' ? promptValue : true)}
                className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 text-sm font-bold text-white shadow-sm transition ${
                  isDanger
                    ? 'bg-rose-600 shadow-rose-200 hover:bg-rose-700'
                    : 'bg-slate-950 shadow-slate-300 hover:bg-slate-800'
                }`}
              >
                {options.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppDialogContext.Provider>
  );
}

export function useAppDialog() {
  const context = useContext(AppDialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within AppDialogProvider');
  }
  return context;
}
