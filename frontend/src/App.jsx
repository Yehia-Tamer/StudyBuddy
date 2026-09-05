import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Documents from './pages/Documents';
import Flashcards from './pages/Flashcards';
import Chat from './pages/Chat';
import Quizzes from './pages/Quizzes';
import StudyPlans from './pages/StudyPlans';
import CheatSheets from './pages/CheatSheets';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/documents" element={<ProtectedRoute><Documents /></ProtectedRoute>} />
        <Route path="/flashcards" element={<ProtectedRoute><Flashcards /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
        <Route path="/quizzes" element={<ProtectedRoute><Quizzes /></ProtectedRoute>} />
        <Route path="/study-plans" element={<ProtectedRoute><StudyPlans /></ProtectedRoute>} />
        <Route path="/cheat-sheets" element={<ProtectedRoute><CheatSheets /></ProtectedRoute>} />

        <Route path="/" element={<Navigate to="/documents" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;