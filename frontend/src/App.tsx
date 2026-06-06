import { MainLayout } from './components/Layout/MainLayout';
import { AuthPage } from './components/Auth/AuthPage';
import { useAuthStore } from './stores/authStore';
import { ToastContainer } from './components/Layout/Toast';
import './index.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="dark">
      <MainLayout />
      <ToastContainer />
    </div>
  );
}

export default App;
