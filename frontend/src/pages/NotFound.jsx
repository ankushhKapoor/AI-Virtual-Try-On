import { ArrowLeft, Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Footer from '../components/Footer'
import Navbar from '../components/Navbar'

function NotFound() {
  return <div className="min-h-screen bg-canvas"><Navbar /><main className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center sm:px-8"><span className="inline-flex size-14 items-center justify-center rounded-full bg-accent-soft text-accent"><Compass size={26} aria-hidden="true" /></span><p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-accent">404 · Style not found</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-ink sm:text-5xl">Looks like this style went missing.</h1><p className="mt-5 max-w-md text-base leading-7 text-muted">The page you’re looking for is no longer here. Let’s get you back to the collection.</p><Link to="/" className="mt-8"><Button icon={ArrowLeft}>Back to Home</Button></Link></main><Footer /></div>
}

export default NotFound
