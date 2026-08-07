import { useState, type FormEvent } from 'react';
import type { Company } from '../types';

export interface CompanyFormPayload {
  name: string;
  inn?: string;
  contactName: string;
  contactEmails: string[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmail = (value: string) => EMAIL_RE.test(value.trim());

const EMPTY_FORM = { name: '', inn: '', contactName: '', contactEmails: [''] };

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

function initialForm(company?: Company) {
  if (!company) return EMPTY_FORM;
  return {
    name: company.name,
    inn: company.inn ?? '',
    contactName: company.contactName,
    contactEmails: company.contactEmails.length > 0 ? company.contactEmails : [''],
  };
}

interface CompanyFormProps {
  /** Компания для редактирования; если не задана — форма создания */
  company?: Company;
  submitLabel: string;
  busyLabel: string;
  fallbackError: string;
  /** Очистить поля после успешной отправки (нужно форме создания) */
  resetOnSuccess?: boolean;
  onSubmit: (payload: CompanyFormPayload) => Promise<void>;
  onCancel?: () => void;
}

export default function CompanyForm({
  company,
  submitLabel,
  busyLabel,
  fallbackError,
  resetOnSuccess = false,
  onSubmit,
  onCancel,
}: CompanyFormProps) {
  const [form, setForm] = useState(() => initialForm(company));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const setEmail = (index: number, value: string) =>
    setForm((p) => ({
      ...p,
      contactEmails: p.contactEmails.map((email, i) => (i === index ? value : email)),
    }));

  const addEmail = () =>
    setForm((p) => ({ ...p, contactEmails: [...p.contactEmails, ''] }));

  const removeEmail = (index: number) =>
    setForm((p) => ({
      ...p,
      contactEmails: p.contactEmails.filter((_, i) => i !== index),
    }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const emails = form.contactEmails.map((email) => email.trim()).filter(Boolean);
    if (emails.length === 0) {
      setError('Укажите хотя бы один контактный email');
      return;
    }
    if (!emails.every(isEmail)) {
      setError('Проверьте формат email — один из адресов заполнен некорректно');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onSubmit({
        name: form.name,
        inn: form.inn || undefined,
        contactName: form.contactName,
        contactEmails: emails,
      });
      if (resetOnSuccess) setForm(EMPTY_FORM);
    } catch (err) {
      setError(errorMessage(err, fallbackError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Название компании"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          value={form.inn}
          onChange={(e) => setForm((p) => ({ ...p, inn: e.target.value }))}
          placeholder="ИНН (необязательно)"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          required
          value={form.contactName}
          onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
          placeholder="Контактное лицо"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">
          Контактные email
        </label>
        {form.contactEmails.map((email, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(i, e.target.value)}
              placeholder="Контактный email"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {form.contactEmails.length > 1 && (
              <button
                type="button"
                onClick={() => removeEmail(i)}
                aria-label="Удалить email"
                title="Удалить email"
                className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addEmail}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          + добавить ещё email
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {busy ? busyLabel : submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Отмена
          </button>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}
