import { useEffect, useState } from 'react';
import { getMe } from '../api/users';
import { ROLE_LABELS } from '../lib/roles';
import type { Me } from '../types';

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
    </div>
  );
}
