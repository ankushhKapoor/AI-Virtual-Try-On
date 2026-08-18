import { ArrowLeft, Camera } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import ImageUploader from '../components/ImageUploader'
import Navbar from '../components/Navbar'
import Breadcrumbs from '../components/products/Breadcrumbs'
import TryOnProgress from '../components/tryon/TryOnProgress'
import UploadGuidelines from '../components/tryon/UploadGuidelines'
import { mockProducts } from '../data/mockProducts'
import useTryOn from '../hooks/useTryOn'

function UploadPhoto() {
  const navigate = useNavigate()
  const location = useLocation()
  const { userPhoto, selectedProduct, selectProduct, setPhoto, clearPhoto } = useTryOn()

  useEffect(() => {
    if (!selectedProduct && location.state?.productId) {
      const product = mockProducts.find((item) => item.id === location.state.productId)
      if (product) selectProduct(product)
    }
  }, [location.state, selectProduct, selectedProduct])

  return <div className="min-h-screen bg-canvas"><Navbar /><main><div className="mx-auto max-w-3xl px-5 py-8 sm:px-8 lg:max-w-7xl lg:px-10 lg:py-12"><Breadcrumbs items={[{ label: 'Shop', to: '/products' }, { label: 'Upload Photo' }]} /><div className="mt-8"><TryOnProgress activeStep={1} /></div><div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16"><section className="max-w-2xl"><Link to="/products" className="inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-accent"><ArrowLeft size={16} aria-hidden="true" /> Back to Shop</Link><div className="mt-7"><p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Step 01 · Your photo</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Upload Your Photo</h1><p className="mt-5 max-w-xl text-base leading-7 text-muted">Choose a clear photo of yourself to create your virtual look.</p></div><div className="mt-8"><ImageUploader initialPreview={userPhoto?.previewUrl} onImageSelect={setPhoto} onRemove={clearPhoto} /></div>{userPhoto?.previewUrl ? <p className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-success"><Camera size={16} aria-hidden="true" /> Photo selected</p> : null}<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"><Button size="lg" disabled={!userPhoto?.previewUrl} onClick={() => navigate('/try-on')}>Continue</Button>{selectedProduct ? <p className="text-sm text-muted">Selected: <strong className="text-ink">{selectedProduct.name}</strong></p> : null}</div></section><div className="space-y-5"><UploadGuidelines />{!selectedProduct ? <div className="rounded-md border border-line bg-surface p-5"><p className="text-sm font-semibold text-ink">No clothing selected yet.</p><p className="mt-2 text-sm leading-6 text-muted">You can still add your photo, then choose a style before starting.</p><Link to="/products" className="mt-4 inline-flex text-sm font-bold text-accent hover:text-accent-dark">Browse Collection</Link></div> : null}</div></div></div></main><Footer /></div>
}

export default UploadPhoto
