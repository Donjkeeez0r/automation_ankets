import { useEffect, useState, type FormEvent } from 'react';
import { getMe, changeMyPassword } from '../api/users';
import { ROLE_LABELS } from '../lib/roles';
import type { Me } from '../types';

const MIN_PASSWORD_LENGTH = 6;

const EMPTY_PASSWORD_FORM = {
  currentPassword: '',
  newPassword: '',
  repeatPassword: '',
};

function ChangePasswordForm() {
  const [form, setForm] = useState(EMPTY_PASSWORD_FORM);
  const [saving, setSaving] = useState(false);
  const [currentPasswordError, setCurrentPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');

  const update = (field: keyof typeof EMPTY_PASSWORD_FORM, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setCurrentPasswordError('');
    setFormError('');
    setSuccess('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setCurrentPasswordError('');
    setFormError('');
    setSuccess('');

    if (form.newPassword.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Новый пароль должен быть не короче ${MIN_PASSWORD_LENGTH} символов.`);
      return;
    }
    if (form.newPassword !== form.repeatPassword) {
      setFormError('Новые пароли не совпадают.');
      return;
    }

    setSaving(true);
    try {
      const { data } = await changeMyPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setForm(EMPTY_PASSWORD_FORM);
      setSuccess(data?.message || 'Пароль изменён!');
    } catch (err) {
      const response = (
        err as { response?: { status?: number; data?: { message?: string | string[] } } }
      )?.response;
      const message = response?.data?.message;
      // Отказ по неверному текущему паролю приходит как 400 со строкой;
      // ошибки class-validator — массивом, их показываем общим сообщением.
      if (response?.status === 400 && typeof message === 'string') {
        setCurrentPasswordError(message);
      } else {
        setFormError(
          (Array.isArray(message) ? message.join(', ') : message) ||
            'Не удалось сменить пароль',
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
      <h2 className="text-sm font-semibold text-gray-800 mb-1">Смена пароля</h2>
      <p className="text-xs text-gray-500 mb-4">
        Минимальная длина нового пароля — {MIN_PASSWORD_LENGTH} символов.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-xs text-gray-500 mb-1"
          >
            Текущий пароль
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={(e) => update('currentPassword', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 ${
              currentPasswordError
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
          />
          {currentPasswordError && (
            <div className="mt-1 text-xs text-red-600">{currentPasswordError}</div>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-xs text-gray-500 mb-1">
            Новый пароль
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete="new-password"
            value={form.newPassword}
            onChange={(e) => update('newPassword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="repeatPassword" className="block text-xs text-gray-500 mb-1">
            Повторите новый пароль
          </label>
          <input
            id="repeatPassword"
            type="password"
            required
            autoComplete="new-password"
            value={form.repeatPassword}
            onChange={(e) => update('repeatPassword', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : 'Сменить пароль'}
          </button>
          {formError && <span className="text-sm text-red-600">{formError}</span>}
          {success && <span className="text-sm text-emerald-600">{success}</span>}
        </div>
      </form>
    </div>
  );
}

export default function ProfilePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then((r) => setMe(r.data))
      .catch(() => setError('Не удалось загрузить данные профиля'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!me) return null;

  const fields = [
    { label: 'Имя пользователя', value: me.name },
    { label: 'Email', value: me.email },
    { label: 'Организация', value: me.organization },
    { label: 'Роль', value: ROLE_LABELS[me.role] },
    { label: 'Дата регистрации', value: new Date(me.createdAt).toLocaleDateString('ru-RU') },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Личный кабинет</h1>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-w-xl">
        {fields.map((field) => (
          <div key={field.label} className="px-6 py-4">
            <div className="text-xs text-gray-400 mb-1">{field.label}</div>
            <div className="text-sm font-medium text-gray-900">{field.value}</div>
          </div>
        ))}
      </div>

      <ChangePasswordForm />
    </div>
  );
}
