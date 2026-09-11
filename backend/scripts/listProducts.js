const products = require('../data/products.json');
const byCategory = {};
products.forEach(p => {
  if (!byCategory[p.category]) byCategory[p.category] = [];
  byCategory[p.category].push({ id: p.id, name: p.name, currentPrice: p.basePrice });
});
for (const [cat, list] of Object.entries(byCategory)) {
  console.log(`\n=== Category: ${cat} (${list.length} products) ===`);
  list.forEach(p => console.log(`  ${p.id}: ${p.name} -> ₹${p.currentPrice}`));
}
