// Generates backend/data/products.json and backend/data/offers.json
// with a much larger catalog (~135 products across 8 categories).
// Offers are assigned by category-aware rules, not pure randomness, so
// each category "feels" right: electronics lean on bank card offers,
// fashion leans on cashback/coupons, groceries get small flat discounts, etc.

const fs = require("fs");
const path = require("path");

const BANKS = ["HDFC Credit Card", "ICICI Debit Card", "SBI Credit Card", "Axis Credit Card", "Kotak Credit Card"];
const CASHBACK_PROVIDERS = ["CRED", "Paytm", "PhonePe", "Amazon Pay", "Google Pay Rewards"];
const UPI_APPS = ["PhonePe UPI", "Google Pay", "Paytm UPI", "Amazon Pay UPI"];

let idCounter = 1;
function nextId() {
  return `p${idCounter++}`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// --- Category definitions: [name, image emoji, platform pool, price range] ---
const CATEGORY_DEFS = {
  Electronics: { image: ["📱", "💻", "🎧", "⌚", "📷", "🎮"], platforms: ["Amazon", "Flipkart"], priceRange: [999, 120000] },
  Fashion: { image: ["👟", "👗", "👕", "👜", "⌚"], platforms: ["Myntra", "Ajio", "Flipkart"], priceRange: [399, 12000] },
  "Home & Kitchen": { image: ["🍳", "🛋️", "🧺", "💡", "🍲"], platforms: ["Amazon", "Flipkart"], priceRange: [299, 25000] },
  Beauty: { image: ["💄", "🧴", "💅"], platforms: ["Nykaa", "Myntra", "Amazon"], priceRange: [149, 4500] },
  Grocery: { image: ["🛒", "🥫", "☕", "🍫"], platforms: ["BigBasket", "Amazon"], priceRange: [49, 1500] },
  "Sports & Fitness": { image: ["🏋️", "🏸", "🚴", "⚽"], platforms: ["Amazon", "Flipkart", "Decathlon"], priceRange: [299, 35000] },
  "Books & Stationery": { image: ["📚", "✏️", "📓"], platforms: ["Amazon", "Flipkart"], priceRange: [99, 1200] },
  "Toys & Baby": { image: ["🧸", "🚗", "🍼"], platforms: ["Amazon", "Flipkart", "FirstCry"], priceRange: [199, 6000] }
};

// --- Product name pools per category (enough variety for ~15-25 each) ---
const PRODUCT_NAMES = {
  Electronics: [
    "Apple iPhone 15", "Apple iPhone 15 Pro", "Samsung Galaxy S24", "Samsung Galaxy A55", "OnePlus 12",
    "Xiaomi Redmi Note 13", "Google Pixel 8", "Dell XPS 13 Laptop", "HP Pavilion 15 Laptop", "Lenovo IdeaPad Slim 5",
    "Apple MacBook Air M2", "Sony WH-1000XM5 Headphones", "boAt Airdopes 141", "JBL Tune 720BT", "Apple AirPods Pro",
    "Apple Watch SE", "Samsung Galaxy Watch 6", "Noise ColorFit Pro 4", "Canon EOS 1500D Camera", "Fujifilm Instax Mini 12",
    "Sony Alpha a6400", "Sony PlayStation 5", "Xbox Series S", "Logitech G Pro Gaming Mouse", "Razer BlackWidow Keyboard"
  ],
  Fashion: [
    "Nike Air Zoom Pegasus", "Adidas Ultraboost 22", "Puma RS-X Sneakers", "Bata Comfort Loafers", "Woodland Casual Boots",
    "Zara Floral Summer Dress", "H&M Cotton Kurta Set", "Levi's 511 Slim Jeans", "Van Heusen Formal Shirt", "Allen Solly Chinos",
    "Fabindia Cotton Kurti", "Biba Printed Anarkali", "W for Woman Ethnic Set", "US Polo Assn Polo T-Shirt", "Roadster Denim Jacket",
    "Caprese Structured Handbag", "Baggit Sling Bag", "Wildcraft Travel Backpack", "American Tourister Duffel",
    "Fossil Analog Watch", "Titan Raga Watch", "Fastrack Chronograph Watch"
  ],
  "Home & Kitchen": [
    "Instant Pot Duo 6L", "Prestige Induction Cooktop", "Philips Air Fryer HD9200", "Bajaj Mixer Grinder", "Wonderchef Nutri-Blend",
    "Milton Thermosteel Flask", "IKEA Storage Ottoman", "Urban Ladder Bookshelf", "Nilkamal Plastic Chair", "Godrej Interio Wardrobe",
    "Philips LED Bulb Pack", "Havells Ceiling Fan", "Hindware Water Purifier", "Butterfly Pressure Cooker", "Cello Dinner Set",
    "Bombay Dyeing Bedsheet Set", "Spaces Cotton Towel Set", "Ajanta Wall Clock", "Solimo Storage Boxes", "Amazon Basics Curtain Set"
  ],
  Beauty: [
    "Lakme Absolute Foundation", "Maybelline Fit Me Concealer", "Nykaa Matte Lipstick", "MAC Ruby Woo Lipstick",
    "The Ordinary Niacinamide Serum", "Minimalist Vitamin C Serum", "Mamaearth Onion Hair Oil", "WOW Skin Science Shampoo",
    "L'Oreal Paris Hair Serum", "Dove Body Wash", "Neutrogena Sunscreen SPF 50", "Cetaphil Gentle Cleanser",
    "Plum Green Tea Face Wash", "Biotique Bio Almond Moisturizer", "Sugar Cosmetics Eyeliner"
  ],
  Grocery: [
    "Tata Sampann Toor Dal 1kg", "Fortune Sunflower Oil 1L", "India Gate Basmati Rice 5kg", "Nescafe Classic Coffee 200g",
    "Bru Instant Coffee 100g", "Amul Butter 500g", "Britannia Marie Gold Biscuits", "Haldiram's Namkeen Mix",
    "Cadbury Dairy Milk Pack", "Nestle Munch Chocolate Box", "Kellogg's Corn Flakes 500g", "Saffola Gold Oil 1L",
    "Real Fruit Juice Mixed Fruit", "Bournvita Health Drink 500g", "MTR Ready to Eat Meal Pack"
  ],
  "Sports & Fitness": [
    "Decathlon Yoga Mat", "Kore Adjustable Dumbbells Set", "Cosco Resistance Bands Set", "boldfit Gym Gloves",
    "Nivia Football", "Yonex Badminton Racket", "Cosco Table Tennis Kit", "Firefox Cricket Bat",
    "Hero Sprint Mountain Bike", "Btwin Cycling Helmet", "Puma Running Shoes", "Nike Dri-FIT Training Shirt",
    "Domyos Skipping Rope", "Kobo Speed Rope Pro", "Strauss Yoga Block Set"
  ],
  "Books & Stationery": [
    "Atomic Habits by James Clear", "The Alchemist by Paulo Coelho", "Ikigai by Hector Garcia", "Rich Dad Poor Dad",
    "NCERT Physics Class 12 Set", "Classmate Notebook Pack", "Parker Jotter Ballpoint Pen", "Faber-Castell Colour Pencils",
    "Camlin Geometry Box", "Apsara Pencil Pack of 20"
  ],
  "Toys & Baby": [
    "LEGO Classic Bricks Set", "Hot Wheels 5-Car Pack", "Funskool Monopoly Board Game", "Fisher-Price Rock-a-Stack",
    "Barbie Dreamhouse Doll Set", "Nerf Elite Blaster", "Pampers Baby Diapers Pack", "Johnson's Baby Care Combo",
    "Chicco Baby Feeding Bottle", "Mothercare Stroller"
  ]
};

function getRealProductImage(name, category) {
  const n = name.toLowerCase();

  if (n.includes("iphone") || n.includes("pixel") || n.includes("galaxy") || n.includes("phone") || n.includes("oneplus") || n.includes("redmi")) {
    return "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("macbook") || n.includes("laptop") || n.includes("dell") || n.includes("hp") || n.includes("ideapad")) {
    return "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("headphone") || n.includes("airpods") || n.includes("airdopes") || n.includes("tune")) {
    return "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("watch")) {
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("camera") || n.includes("eos") || n.includes("instax") || n.includes("alpha")) {
    return "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("playstation") || n.includes("xbox") || n.includes("mouse") || n.includes("keyboard")) {
    return "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("shoe") || n.includes("sneaker") || n.includes("boot") || n.includes("loafers") || n.includes("pegasus") || n.includes("ultraboost")) {
    return "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("dress") || n.includes("kurta") || n.includes("jeans") || n.includes("shirt") || n.includes("chinos") || n.includes("kurti") || n.includes("anarkali") || n.includes("jacket")) {
    return "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&auto=format&fit=crop&q=80";
  }
  if (n.includes("bag") || n.includes("backpack") || n.includes("handbag") || n.includes("duffel")) {
    return "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Home & Kitchen") {
    return "https://images.unsplash.com/photo-1588854337221-4cf9fa96059c?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Beauty") {
    return "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Grocery") {
    return "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Sports & Fitness") {
    return "https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Books & Stationery") {
    return "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&auto=format&fit=crop&q=80";
  }
  if (category === "Toys & Baby") {
    return "https://images.unsplash.com/photo-1558060370-d644479be6e7?w=600&auto=format&fit=crop&q=80";
  }

  return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
}

const products = [];
const offers = {};

for (const [category, names] of Object.entries(PRODUCT_NAMES)) {
  const def = CATEGORY_DEFS[category];
  for (const name of names) {
    const id = nextId();
    const basePrice = randomBetween(def.priceRange[0], def.priceRange[1]);
    const platform = pick(def.platforms);

    products.push({
      id,
      name,
      category,
      image: getRealProductImage(name, category),
      platform,
      basePrice
    });

    offers[id] = generateOffers(category, basePrice, platform);
  }
}

// Category-aware offer generation — higher-value electronics/sports gear lean
// on percentage bank offers with caps; everyday categories (grocery, books)
// get small flat discounts; fashion/beauty lean on cashback + coupons.
function generateOffers(category, basePrice, platform) {
  const coupons = [];
  const cashback = [];
  const bankOffers = [];
  const upiOffers = [];

  const hasCoupon = Math.random() < 0.85;
  const hasCashback = Math.random() < 0.7;
  const hasBankOffer = basePrice > 800 && Math.random() < 0.65;
  const hasUpiOffer = basePrice > 300 && basePrice < 15000 && Math.random() < 0.5;

  if (hasCoupon) {
    const isPercent = ["Fashion", "Beauty", "Sports & Fitness"].includes(category) ? Math.random() < 0.6 : Math.random() < 0.3;
    const flatValue = Math.min(randomBetween(50, 500), Math.round(basePrice * 0.15));
    if (isPercent) {
      coupons.push({ id: `${idCounter}c`, code: `SAVE${randomBetween(5, 20)}`, type: "percent", value: randomBetween(5, 20), maxValue: Math.round(basePrice * 0.15), source: platform });
    } else if (flatValue > 0) {
      coupons.push({ id: `${idCounter}c`, code: `FLAT${randomBetween(50, 500)}`, type: "flat", value: flatValue, source: platform });
    }
  }

  if (hasCashback) {
    const maxValue = Math.round(basePrice * 0.06);
    if (maxValue > 0) {
      cashback.push({ id: `${idCounter}cb`, provider: pick(CASHBACK_PROVIDERS), type: "percent", value: randomBetween(2, 6), maxValue });
    }
  }

  if (hasBankOffer) {
    const maxValue = Math.round(basePrice * 0.08);
    if (maxValue > 0) {
      bankOffers.push({ id: `${idCounter}b`, bank: pick(BANKS), type: "percent", value: randomBetween(8, 12), maxValue });
    }
  }

  if (hasUpiOffer) {
    const value = Math.min(randomBetween(20, 300), Math.round(basePrice * 0.06));
    if (value > 0) {
      upiOffers.push({ id: `${idCounter}u`, app: pick(UPI_APPS), type: "flat", value });
    }
  }

  return { coupons, cashback, bankOffers, upiOffers };
}

const outDir = path.join(__dirname, "..", "data");
fs.writeFileSync(path.join(outDir, "products.json"), JSON.stringify(products, null, 2));
fs.writeFileSync(path.join(outDir, "offers.json"), JSON.stringify(offers, null, 2));

console.log(`Generated ${products.length} products across ${Object.keys(PRODUCT_NAMES).length} categories.`);
