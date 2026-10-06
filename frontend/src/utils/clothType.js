const overallPattern = /\b(?:dress(?:es)?|gown(?:s)?|jumpsuit(?:s)?|romper(?:s)?|playsuit(?:s)?|one[ -]?piece|saree(?:s)?|sari(?:s)?|kaftan(?:s)?|kurti(?:s)?|kurta[ -]?set(?:s)?|salwar[ -]?suit(?:s)?|anarkali(?:s)?|lehenga(?:s)?|ethnic[ -]?suit(?:s)?|co[ -]?ord(?:inate)?(?:[ -]?set)?s?|tracksuit(?:s)?)\b/i
const ethnicTopAndBottomPattern = /\b(?:kurta(?:s)?|kurti(?:s)?)\b.{0,80}\b(?:pyjamas?|pajamas?|salwars?|churidars?|(?:palaz+o+|plaz+o+)(?:s)?|shararas?|gharara(?:s)?|dhoti(?:s)?|pants?|trousers?|leggings?)\b|\b(?:pyjamas?|pajamas?|salwars?|churidars?|(?:palaz+o+|plaz+o+)(?:s)?|shararas?|gharara(?:s)?|dhoti(?:s)?|pants?|trousers?|leggings?)\b.{0,80}\b(?:kurta(?:s)?|kurti(?:s)?)\b/i
const lowerPattern = /\b(?:jeans?|trousers?|pants?|shorts?|skirts?|leggings?|jeggings?|joggers?|track[ -]?pants?|sweatpants?|chinos?|cargos?|culottes?|palazzos?|salwars?|pyjamas?|pajamas?|dhoti(?:s)?)\b/i
const upperPattern = /\b(?:t[ -]?shirts?|shirts?|tops?|blouses?|tunics?|jackets?|blazers?|coats?|hoodies?|sweatshirts?|sweaters?|cardigans?|polos?|kurtas?|tees?)\b/i

export function detectClothType(product = {}) {
  const metadata = [
    product.clothType,
    product.category,
    product.title,
    product.name,
    product.description,
    ...(Array.isArray(product.categories) ? product.categories : []),
    ...(Array.isArray(product.categoryPath) ? product.categoryPath : []),
  ].join(' ')

  if (overallPattern.test(metadata) || ethnicTopAndBottomPattern.test(metadata)) return 'overall'
  if (lowerPattern.test(metadata)) return 'lower'
  if (upperPattern.test(metadata)) return 'upper'
  return 'upper'
}
