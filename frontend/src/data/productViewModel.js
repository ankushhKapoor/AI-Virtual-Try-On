function toProductViewModel(product) {
  const isBackendProduct = Object.prototype.hasOwnProperty.call(product, 'title') || Object.prototype.hasOwnProperty.call(product, 'image_url')
  return {
    ...product,
    name: product.title ?? product.name ?? 'Untitled product',
    image: product.image ?? product.image_url ?? product.thumbnail ?? null,
    category: product.category ?? '',
    price: product.price ?? null,
    currency: product.currency ?? (isBackendProduct ? null : 'â‚¹'),
  }
}

export { toProductViewModel }