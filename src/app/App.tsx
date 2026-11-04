import { Navigate, Route, Routes } from 'react-router-dom';
import { SignInPage } from '../features/auth/SignInPage';
import { useAuthStore } from '../features/auth/authStore';
import { LibraryPage } from '../features/library/LibraryPage';

export function App() {
  const authorized = useAuthStore((state) => state.status === 'authorized');
  return <Routes><Route path="/" element={authorized ? <Navigate to="/library" replace /> : <SignInPage />} /><Route path="/library" element={authorized ? <LibraryPage /> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
