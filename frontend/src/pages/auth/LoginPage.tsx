import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import type { User } from '../../types';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await apiLogin(email, password);
      const token = data.access_token;

      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(
        decodeURIComponent(
          atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''),
        ),
      );
      const user: User = {
        userId: payload.sub,
        email: payload.email,
        name: payload.name,
        organization: payload.organization,
        role: payload.role,
      };

      login(token, user);
      navigate(user.role === 'CONTRACTOR' ? '/my-questionnaires' : '/questionnaires');
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            КОМПАНИЯ
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Анкетирование ИБ</h1>
          <p className="mt-1 text-sm text-gray-500">Войдите в систему</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-500">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-medium">
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
