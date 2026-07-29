import { useEffect, useState, type FormEvent } from 'react';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resetPassword,
} from '../../api/users';
import { ROLE_LABELS } from '../../lib/roles';
import type { ManagedUser, Role } from '../../types';

const ROLES: Role[] = ['ADMIN', 'EMPLOYEE', 'AUDITOR'];

const EMPTY_FORM = { email: '', name: '', organization: '', role: 'EMPLOYEE' as Role };

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

function PasswordModal({
  password,
  onClose,
}: {
  password: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Пароль сгенерирован</h3>
        <p className="text-sm text-gray-500 mb-4">
          Передайте этот пароль сотруднику. Он показывается один раз и больше нигде не хранится.
        </p>
        <div className="flex items-center gap-2 mb-5">
          <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono text-gray-900 break-all">
            {password}
          </code>
          <button
            onClick={copy}
            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            {copied ? 'Скопировано ✓' : 'Копировать'}
          </button>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({
  user,
  onClose,
  onSaved,
}: {
  user: ManagedUser;
  onClose: () => void;
  onSaved: (u: ManagedUser) => void;
}) {
  const [form, setForm] = useState({
    email: user.email,
    name: user.name,
    organization: user.organization,
    role: user.role,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const { data } = await updateUser(user.id, form);
      onSaved(data);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сохранить'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Редактировать пользователя</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="ФИО"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            value={form.organization}
            onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
            placeholder="Организация"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null>(null);

  const load = () => {
    getUsers()
      .then((r) => setUsers(r.data))
      .catch(() => setError('Не удалось загрузить пользователей'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const { data } = await createUser(form);
      setGeneratedPassword(data.generatedPassword);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setCreateError(errorMessage(err, 'Не удалось создать пользователя'));
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (user: ManagedUser) => {
    if (!confirm(`Удалить пользователя ${user.name}?`)) return;
    try {
      await deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch {
      alert('Не удалось удалить пользователя');
    }
  };

  const handleReset = async (user: ManagedUser) => {
    if (!confirm(`Сбросить пароль пользователя ${user.name}?`)) return;
    try {
      const { data } = await resetPassword(user.id);
      setGeneratedPassword(data.generatedPassword);
    } catch {
      alert('Не удалось сбросить пароль');
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Пользователи</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Создать пользователя</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="ФИО"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            required
            value={form.organization}
            onChange={(e) => setForm((p) => ({ ...p, organization: e.target.value }))}
            placeholder="Организация"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="Email"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Создание...' : 'Создать'}
          </button>
        </form>
        {createError && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {createError}
          </div>
        )}
      </div>

      {users.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Пользователи не найдены
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Имя</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Организация</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Роль</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-gray-700">{u.email}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-gray-500">{u.organization}</td>
                  <td className="px-6 py-4 text-gray-500">{ROLE_LABELS[u.role]}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-3 whitespace-nowrap">
                      <button
                        onClick={() => setEditing(u)}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        Редактировать
                      </button>
                      <button
                        onClick={() => handleReset(u)}
                        className="text-gray-600 hover:underline font-medium"
                      >
                        Сбросить пароль
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="text-red-600 hover:underline font-medium"
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {generatedPassword && (
        <PasswordModal
          password={generatedPassword}
          onClose={() => setGeneratedPassword(null)}
        />
      )}
      {editing && (
        <EditModal
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => {
            setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
