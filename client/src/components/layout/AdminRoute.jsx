import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../common/index.jsx';
import toast from 'react-hot-toast';

export default function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated && !isAdmin) {
      toast.error('Access Denied. Admin privileges required.');
      setShowWarning(true);
    }
  }, [loading, isAuthenticated, isAdmin]);

  if (loading) return <LoadingSpinner fullPage />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
