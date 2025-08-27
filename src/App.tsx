import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import CriteriaManager from './pages/CriteriaManager';
import AuditPage from './pages/AuditPage';
import YearGroupManager from './pages/yearGroupManager';
import ProgramCriteria from './pages/programCirteria';


const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token } = useAuth();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/year-groups" element={<ProtectedRoute><YearGroupManager /></ProtectedRoute>} />
        <Route path="/criteria" element={<ProtectedRoute><ProgramCriteria /></ProtectedRoute>} />
        <Route
          path="/criteria"
          element={
            <ProtectedRoute>
              <CriteriaManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;