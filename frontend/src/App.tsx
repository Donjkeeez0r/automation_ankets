import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { landingPath } from './lib/roles';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/ProfilePage';

import UsersPage from './pages/admin/UsersPage';
import CompaniesPage from './pages/employee/CompaniesPage';
import QuestionnairesListPage from './pages/auditor/QuestionnairesListPage';
import QuestionnaireReviewPage from './pages/auditor/QuestionnaireReviewPage';
import FillPage from './pages/fill/FillPage';

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={landingPath(user?.role)} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Подрядчик — без авторизации, по одноразовой ссылке */}
          <Route path="/fill/:token" element={<FillPage />} />

          {/* Общие маршруты */}
          <Route element={<Layout />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ADMIN — управление пользователями */}
          <Route element={<Layout requiredRole="ADMIN" />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Компании: EMPLOYEE — ведение, AUDITOR — просмотр и удаление */}
          <Route element={<Layout requiredRole={['EMPLOYEE', 'AUDITOR']} />}>
            <Route path="/companies" element={<CompaniesPage />} />
          </Route>

          {/* AUDITOR — проверка анкет */}
          <Route element={<Layout requiredRole="AUDITOR" />}>
            <Route path="/questionnaires" element={<QuestionnairesListPage />} />
            <Route path="/questionnaires/:id" element={<QuestionnaireReviewPage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
