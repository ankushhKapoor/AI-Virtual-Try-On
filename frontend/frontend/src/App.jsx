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
import TryOnProvider from './context/TryOnContext'
import NotFound from './pages/NotFound'

function App() {
  return (
    <TryOnProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/upload" element={<UploadPhoto />} />
          <Route path="/try-on" element={<TryOn />} />
          <Route path="/processing" element={<Processing />} />
          <Route path="/result/:id" element={<TryOnResult />} />
          <Route path="/compare" element={<CompareLooks />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/saved-looks" element={<SavedLooks />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TryOnProvider>
  )
}

export default App
