// src/layouts/PublicLayout.tsx
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Header />

      <main className="flex-1 pb-safe">
        <Outlet />
      </main>

      <Footer />

      {/* Mobile bottom navigation — hidden on md+ */}
      <BottomNav />
    </div>
  );
}
