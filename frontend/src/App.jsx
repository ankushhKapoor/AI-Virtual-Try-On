import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetails from './pages/ProductDetails'
import UploadPhoto from './pages/UploadPhoto'
import TryOn from './pages/TryOn'
import Processing from './pages/Processing'
import TryOnResult from './pages/TryOnResult'
import CompareLooks from './pages/CompareLooks'
import Wishlist from './pages/Wishlist'
import SavedLooks from './pages/SavedLooks'
import History from './pages/History'
import HowItWorks from './pages/HowItWorks'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import TryOnProvider from './context/TryOnContext'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute, { AdminRoute, GuestRoute } from './components/ProtectedRoute'
import NotFound from './pages/NotFound'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TryOnProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/upload" element={<UploadPhoto />} />
          <Route path="/try-on" element={<TryOn />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/result/:id" element={<TryOnResult />} />
          <Route path="/compare" element={<CompareLooks />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/saved-looks" element={<SavedLooks />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
          <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
          <Route path="/admin/login" element={<GuestRoute><AdminLogin /></GuestRoute>} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
        </TryOnProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
