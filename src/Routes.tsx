
import { Routes as RouterRoutes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/components/auth/AuthProvider';

// Import your page components
import Index from '@/pages/Index';
import Auth from '@/pages/Auth';
import AIAgent from '@/pages/AIAgent';
import Explore from '@/pages/Explore';
import ImageToVideo from '@/pages/ImageToVideo';
import Metadata from '@/pages/Metadata';
import Plans from '@/pages/Plans';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import ProductShoot from '@/pages/ProductShoot';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';

const Routes = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <RouterRoutes>
      <Route path="/" element={<Index />} />
      
      {/* Auth Routes */}
      <Route path="/auth" element={<Auth />}>
        <Route path="login" element={<LoginForm />} />
        <Route path="signup" element={<SignupForm />} />
      </Route>
      
      {/* Public Routes */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/plans" element={<Plans />} />
      
      {/* Protected Routes */}
      <Route
        path="/ai-agent"
        element={
          <ProtectedRoute>
            <AIAgent />
          </ProtectedRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <ProtectedRoute>
            <Explore />
          </ProtectedRoute>
        }
      />
      <Route
        path="/image-to-video"
        element={
          <ProtectedRoute>
            <ImageToVideo />
          </ProtectedRoute>
        }
      />
      <Route
        path="/metadata"
        element={
          <ProtectedRoute>
            <Metadata />
          </ProtectedRoute>
        }
      />
      <Route
        path="/product-shoot"
        element={
          <ProtectedRoute>
            <ProductShoot />
          </ProtectedRoute>
        }
      />

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </RouterRoutes>
  );
};

export default Routes;
