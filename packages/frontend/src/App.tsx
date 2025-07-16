import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { CallbackPage } from './pages/CallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreatePostPage } from './pages/CreatePostPage';
import { Layout } from './components/Layout';
import { AuthProvider } from './context/AuthContext';

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path='/auth/login' element={<LoginPage />} />
          <Route path='/auth/callback' element={<CallbackPage />} />
          <Route
            path='/'
            element={
              <Layout>
                <DashboardPage />
              </Layout>
            }
          />
          <Route
            path='/posts/new'
            element={
              <Layout>
                <CreatePostPage />
              </Layout>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
