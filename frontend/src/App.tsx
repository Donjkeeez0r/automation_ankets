import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';

import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import ProfilePage from './pages/ProfilePage';

import MyQuestionnairesPage from './pages/contractor/MyQuestionnairesPage';
import FillQuestionnairePage from './pages/contractor/FillQuestionnairePage';
import ViewAnswersPage from './pages/contractor/ViewAnswersPage';

import AllQuestionnairesPage from './pages/employee/AllQuestionnairesPage';
import CreateQuestionnairePage from './pages/employee/CreateQuestionnairePage';
import QuestionnaireDetailPage from './pages/employee/QuestionnaireDetailPage';
import ScoringPage from './pages/employee/ScoringPage';
import RecommendationsPage from './pages/employee/RecommendationsPage';

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={user?.role === 'CONTRACTOR' ? '/my-questionnaires' : '/questionnaires'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Shared routes */}
          <Route element={<Layout />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Contractor routes */}
          <Route element={<Layout requiredRole="CONTRACTOR" />}>
            <Route path="/my-questionnaires" element={<MyQuestionnairesPage />} />
            <Route path="/questionnaires/:id/fill" element={<FillQuestionnairePage />} />
            <Route path="/questionnaires/:id/view" element={<ViewAnswersPage />} />
          </Route>

          {/* Employee routes */}
          <Route element={<Layout requiredRole="EMPLOYEE" />}>
            <Route path="/questionnaires" element={<AllQuestionnairesPage />} />
            <Route path="/questionnaires/new" element={<CreateQuestionnairePage />} />
            <Route path="/questionnaires/:id" element={<QuestionnaireDetailPage />} />
            <Route path="/questionnaires/:id/scoring" element={<ScoringPage />} />
            <Route path="/questionnaires/:id/recommendations" element={<RecommendationsPage />} />
          </Route>

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
