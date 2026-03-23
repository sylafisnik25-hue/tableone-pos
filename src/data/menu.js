/**
 * Menu: category → array of { name, price, cooks? }.
 * cooks: true → show quick cook level chips on order line (steak, etc.).
 */
const rawMenu = {
  Drinks: [
    { name: 'Coke', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Diet Coke', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Lemonade', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Juices', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Bravo', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Fanta Exotic', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Lemon Soda', price: 3.5, drinkGroup: 'Soft Drinks' },
    { name: 'Red Bull', price: 4.0, drinkGroup: 'Soft Drinks' },

    { name: 'Espresso', price: 2.5, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Double Espresso', price: 3.0, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Americano', price: 3.0, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Cappuccino', price: 3.5, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Latte', price: 3.5, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Flat White', price: 3.5, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Mocha', price: 3.8, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Tea', price: 2.5, drinkGroup: 'Hot Drinks', route: 'bar' },
    { name: 'Hot Chocolate', price: 3.8, drinkGroup: 'Hot Drinks', route: 'bar' },

    { name: 'Peroni Pint', price: 5.95, drinkGroup: 'Beers' },
    { name: 'Peroni Half Pint', price: 3.25, drinkGroup: 'Beers' },
    { name: 'Madri Pint', price: 5.95, drinkGroup: 'Beers' },
    { name: 'Madri Half Pint', price: 3.25, drinkGroup: 'Beers' },
    { name: 'Corona', price: 4.5, drinkGroup: 'Beers' },
    { name: 'Peroni 0.0', price: 3.5, drinkGroup: 'Beers' },
    { name: 'Cider', price: 6.95, drinkGroup: 'Beers' },

    { name: 'Prosecco Glass', price: 8.95, drinkGroup: 'Wines' },
    { name: 'Prosecco Bottle', price: 29.95, drinkGroup: 'Wines' },

    { name: 'Margarita', price: 11.95, drinkGroup: 'Cocktails' },
    { name: 'Espresso Martini', price: 12.95, drinkGroup: 'Cocktails' },
    { name: 'Porn Star Martini', price: 12.95, drinkGroup: 'Cocktails' },
    { name: 'Mi Piace Cocktail', price: 13.95, drinkGroup: 'Cocktails' },
    { name: 'Oceanic', price: 12.95, drinkGroup: 'Cocktails' },
    { name: 'Mojito', price: 11.95, drinkGroup: 'Cocktails' },
    { name: 'Strawberry Daiquiri', price: 11.95, drinkGroup: 'Cocktails' },
    { name: 'Cosmopolitan', price: 11.95, drinkGroup: 'Cocktails' },
    { name: 'Negroni', price: 12.95, drinkGroup: 'Cocktails' },
    { name: 'Old Fashioned', price: 12.95, drinkGroup: 'Cocktails' },
    { name: 'Aperol Spritz', price: 11.95, drinkGroup: 'Cocktails' },
  ],
  Food: [
    { name: 'Homemade Bread Basket', price: 3.95 },
    { name: 'Garlic Bread', price: 8.95 },
    { name: 'Mixed Olives', price: 3.95 },

    { name: 'Calamari', price: 11.95 },
    { name: 'Spicy Prawns', price: 10.45 },
    { name: 'Tagliere Affettati', price: 21.95 },
    { name: 'Mozzarella Infornata', price: 8.95 },
    { name: 'Bruschetta', price: 8.95 },

    { name: 'Margherita Pizza', price: 11.95 },
    { name: 'Pepperoni Pizza', price: 12.45 },
    { name: 'Vegetariana Pizza', price: 13.45 },
    { name: 'Calzone', price: 12.95 },

    { name: 'Arrabbiata', price: 12.95 },
    { name: 'Carbonara', price: 14.95 },
    { name: 'Lasagna', price: 13.95 },

    { name: 'Sea Bass', price: 18.95 },
    { name: 'Salmon', price: 18.95 },
    { name: 'Mixed Fish', price: 67.95 },

    { name: 'Chicken Grill', price: 18.95 },
    { name: 'Tomahawk Steak', price: 67.95 },
    { name: 'Tagliata Steak', price: 28.95 },

    { name: 'Risotto Prawns', price: 18.95 },
    { name: 'Risotto Veg', price: 11.95 },
  ],
  Desserts: [
    { name: 'Chocolate Cake', price: 7.45 },
    { name: 'Tiramisu', price: 7.95 },
    { name: 'Banoffee', price: 7.95 },
    { name: 'Gelato', price: 4.95 },
    { name: 'Pannacotta Berries', price: 7.45 },
    { name: 'Pannacotta Pistachio', price: 7.45 },
    { name: 'Cheesecake Pear', price: 7.95 },
    { name: 'Cheesecake Strawberry', price: 7.95 },
  ],
  'Kids Menu': [
    { name: 'Kids Pasta', price: 8.95 },
    { name: 'Kids Bolognese', price: 8.95 },
    { name: 'Kids Alfredo', price: 8.95 },
    { name: 'Kids Margherita Pizza', price: 8.95 },
  ],
}

let id = 0
const menu = {}
const menuByCategory = {}
const flatItems = []

for (const [category, items] of Object.entries(rawMenu)) {
  menuByCategory[category] = items.map((item) => {
    const entry = {
      id: ++id,
      name: item.name,
      price: item.price,
      category,
      route: item.route || (category === 'Drinks' ? 'bar' : 'kitchen'),
      ...(item.drinkGroup ? { drinkGroup: item.drinkGroup } : {}),
      ...(item.cooks ? { cooks: true } : {}),
    }
    flatItems.push(entry)
    return entry
  })
  menu[category] = menuByCategory[category]
}

export { menu, menuByCategory }
export const categories = Object.keys(menu)
export const menuItems = flatItems
