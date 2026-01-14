import { MainLayout } from './components/Layout/MainLayout';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuthStore } from './stores/authStore';
import './index.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <AuthPage />;
  }

  return (
    <div className="dark">
      <MainLayout />
    </div>
  );
}

export default App;
