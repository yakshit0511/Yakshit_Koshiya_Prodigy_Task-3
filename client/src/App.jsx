/**
 * App.jsx — Root router with all route definitions.
 * - Public routes: accessible to all
 * - Protected routes: require authentication
 * - Admin routes: require admin role
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import CompareFloatingBar from './components/product/CompareFloatingBar';
import { LoadingSpinner } from './components/common/index.jsx';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import AdminRoute from './components/layout/AdminRoute';

/* ---- Lazy-loaded pages ---- */
const HomePage           = lazy(() => import('./pages/public/HomePage'));
const ProductListPage    = lazy(() => import('./pages/public/ProductListPage'));
const ProductDetailPage  = lazy(() => import('./pages/public/ProductDetailPage'));
const CartPage           = lazy(() => import('./pages/public/CartPage'));
const CategoryPage       = lazy(() => import('./pages/public/CategoryPage'));
const SearchPage         = lazy(() => import('./pages/public/SearchPage'));
const WishlistPage       = lazy(() => import('./pages/public/WishlistPage'));
const CheckoutPage       = lazy(() => import('./pages/public/CheckoutPage'));
const OrderSuccessPage   = lazy(() => import('./pages/public/OrderSuccessPage'));

// Auth
const LoginPage           = lazy(() => import('./pages/auth/LoginPage'));
const RegisterPage        = lazy(() => import('./pages/auth/RegisterPage'));
const ForgotPasswordPage  = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Customer
const ProfilePage      = lazy(() => import('./pages/customer/ProfilePage'));
const MyOrdersPage     = lazy(() => import('./pages/customer/MyOrdersPage'));
const OrderDetailPage  = lazy(() => import('./pages/customer/OrderDetailPage'));
const MyReviewsPage    = lazy(() => import('./pages/customer/MyReviewsPage'));
const SupportPage      = lazy(() => import('./pages/customer/SupportPage'));
const TicketDetailPage = lazy(() => import('./pages/customer/TicketDetailPage'));
const AddressesPage    = lazy(() => import('./pages/customer/AddressesPage'));

// Admin
const AdminDashboardPage      = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminProductsPage       = lazy(() => import('./pages/admin/AdminProductsPage'));
const AdminAddProductPage     = lazy(() => import('./pages/admin/AdminAddProductPage'));
const AdminEditProductPage    = lazy(() => import('./pages/admin/AdminEditProductPage'));
const AdminCategoriesPage     = lazy(() => import('./pages/admin/AdminCategoriesPage'));
const AdminOrdersPage         = lazy(() => import('./pages/admin/AdminOrdersPage'));
const AdminOrderDetailPage    = lazy(() => import('./pages/admin/AdminOrderDetailPage'));
const AdminCustomersPage      = lazy(() => import('./pages/admin/AdminCustomersPage'));
const AdminReviewsPage        = lazy(() => import('./pages/admin/AdminReviewsPage'));
const AdminCouponsPage        = lazy(() => import('./pages/admin/AdminCouponsPage'));
const AdminSupportPage        = lazy(() => import('./pages/admin/AdminSupportPage'));
const AdminSupportTicketPage  = lazy(() => import('./pages/admin/AdminSupportTicketPage'));

/* ---- Route guards ---- */
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingSpinner fullPage />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
};

/* ---- Main Layout wrapper ---- */
const PublicLayout = ({ children }) => (
  <>
    <Navbar />
    <main className="page-wrapper">
      <div className="container">
        <Suspense fallback={<LoadingSpinner fullPage />}>{children}</Suspense>
      </div>
    </main>
    <Footer />
    <MobileBottomNav />
    <CompareFloatingBar />
  </>
);

/* ---- Admin layout (no public navbar/footer) ---- */
const AdminLayout = ({ children }) => (
  <Suspense fallback={<LoadingSpinner fullPage />}>{children}</Suspense>
);

export default function App() {
  return (
    <Routes>
      {/* ---- Public routes ---- */}
      <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
      <Route path="/products" element={<PublicLayout><ProductListPage /></PublicLayout>} />
      <Route path="/products/:slug" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
      <Route path="/category/:slug" element={<PublicLayout><CategoryPage /></PublicLayout>} />
      <Route path="/search" element={<PublicLayout><SearchPage /></PublicLayout>} />
      <Route path="/cart" element={<PublicLayout><CartPage /></PublicLayout>} />

      {/* ---- Auth routes (guest only) ---- */}
      <Route path="/login" element={<GuestRoute><PublicLayout><LoginPage /></PublicLayout></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><PublicLayout><RegisterPage /></PublicLayout></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><PublicLayout><ForgotPasswordPage /></PublicLayout></GuestRoute>} />
      <Route path="/reset-password/:token" element={<GuestRoute><PublicLayout><ResetPasswordPage /></PublicLayout></GuestRoute>} />

      {/* ---- Protected customer routes ---- */}
      <Route path="/checkout" element={<ProtectedRoute><PublicLayout><CheckoutPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/order-success" element={<ProtectedRoute><PublicLayout><OrderSuccessPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/wishlist" element={<ProtectedRoute><PublicLayout><WishlistPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><PublicLayout><ProfilePage /></PublicLayout></ProtectedRoute>} />
      <Route path="/my-orders" element={<ProtectedRoute><PublicLayout><MyOrdersPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/my-orders/:orderId" element={<ProtectedRoute><PublicLayout><OrderDetailPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/my-reviews" element={<ProtectedRoute><PublicLayout><MyReviewsPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/support" element={<ProtectedRoute><PublicLayout><SupportPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/support/:ticketId" element={<ProtectedRoute><PublicLayout><TicketDetailPage /></PublicLayout></ProtectedRoute>} />
      <Route path="/addresses" element={<ProtectedRoute><PublicLayout><AddressesPage /></PublicLayout></ProtectedRoute>} />

      {/* ---- Admin routes ---- */}
      <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout><AdminDashboardPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminLayout><AdminProductsPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products/add" element={<AdminRoute><AdminLayout><AdminAddProductPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/products/:id/edit" element={<AdminRoute><AdminLayout><AdminEditProductPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/categories" element={<AdminRoute><AdminLayout><AdminCategoriesPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/orders" element={<AdminRoute><AdminLayout><AdminOrdersPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/orders/:id" element={<AdminRoute><AdminLayout><AdminOrderDetailPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/customers" element={<AdminRoute><AdminLayout><AdminCustomersPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/reviews" element={<AdminRoute><AdminLayout><AdminReviewsPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/coupons" element={<AdminRoute><AdminLayout><AdminCouponsPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/support" element={<AdminRoute><AdminLayout><AdminSupportPage /></AdminLayout></AdminRoute>} />
      <Route path="/admin/support/:ticketId" element={<AdminRoute><AdminLayout><AdminSupportTicketPage /></AdminLayout></AdminRoute>} />

      {/* ---- 404 ---- */}
      <Route path="*" element={
        <PublicLayout>
          <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <div style={{ fontSize: 80 }}>🔍</div>
            <h1 style={{ fontSize: 48, fontWeight: 800, margin: '16px 0 8px' }}>404</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 18, marginBottom: 24 }}>
              Oops! The page you're looking for doesn't exist.
            </p>
            <a href="/" className="btn btn-primary btn-lg">Go Home</a>
          </div>
        </PublicLayout>
      } />
    </Routes>
  );
}
