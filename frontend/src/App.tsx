import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { landingPath } from './lib/roles';

import LoginPage from './pages/auth/LoginPage';
import ProfilePage from './pages/ProfilePage';

import UsersPage from './pages/admin/UsersPage';
import CompaniesPage from './pages/employee/CompaniesPage';
import QuestionsPage from './pages/employee/QuestionsPage';
import QuestionnairesListPage from './pages/questionnaires/QuestionnairesListPage';
import QuestionnaireReviewPage from './pages/questionnaires/QuestionnaireReviewPage';
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

          {/* Подрядчик — без авторизации, по одноразовой ссылке */}
          <Route path="/fill/:token" element={<FillPage />} />

          {/* Общие маршруты */}
          <Route element={<Layout />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* ADMIN — управление пользователями */}
          <Route element={<Layout allowedRoles={['ADMIN']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>

          {/* Обе роли. Что именно можно менять на этих страницах, решают
              права конкретной роли (lib/permissions.ts, docs/ROLES.md):
              ADMIN — банк вопросов, удаление и передача анкет, просмотр остального;
              EMPLOYEE — работа со своими анкетами, просмотр чужих. */}
          <Route element={<Layout allowedRoles={['ADMIN', 'EMPLOYEE']} />}>
            <Route path="/companies" element={<CompaniesPage />} />
            {/* Глубокая ссылка на конкретную компанию: тот же список,
                но нужная карточка раскрыта и подсвечена */}
            <Route path="/companies/:companyId" element={<CompaniesPage />} />
            <Route path="/questions" element={<QuestionsPage />} />
            {/* Один список на оба типа анкет; key пересоздаёт страницу при переходе */}
            <Route
              path="/questionnaires"
              element={<QuestionnairesListPage key="SECURITY" type="SECURITY" />}
            />
            <Route path="/questionnaires/:id" element={<QuestionnaireReviewPage />} />
            <Route
              path="/maturity"
              element={<QuestionnairesListPage key="MATURITY" type="MATURITY" />}
            />
            <Route path="/maturity/:id" element={<QuestionnaireReviewPage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
