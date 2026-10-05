import { Sparkles } from 'lucide-react'
import Button from './Button'

function TryOnButton({ onClick, size = 'sm', children = 'Try On', className = '' }) {
  return <Button size={size} variant="secondary" icon={Sparkles} onClick={onClick} className={className}>{children}</Button>
}

export default TryOnButton
