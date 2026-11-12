import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { SignInPage } from '../features/auth/SignInPage';
import { useAuthStore } from '../features/auth/authStore';
import { LibraryPage } from '../features/library/LibraryPage';

const ReaderPage = lazy(() => import('../features/reader/ReaderPage').then((module) => ({ default: module.ReaderPage })));

export function App() {
  const authorized = useAuthStore((state) => state.status === 'authorized');
  return <Routes><Route path="/" element={authorized ? <Navigate to="/library" replace /> : <SignInPage />} /><Route path="/library" element={authorized ? <LibraryPage /> : <Navigate to="/" replace />} /><Route path="/reader/:bookId" element={authorized ? <Suspense fallback={<div className="reader-loading">Loading reader…</div>}><ReaderPage /></Suspense> : <Navigate to="/" replace />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>;
}
