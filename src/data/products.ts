import { Product, ProductCategory } from '../types/product';

export const products: Product[] = [
  {
    id: 'beef-brisket',
    name: 'Smoky & Peppery Beef Brisket',
    category: ProductCategory.BEEF,
    description: 'Australian grain fed beef brisket cooked low and slow, seasoned with a black pepper, coffee and cocoa rub and a hint of smoky hickory.',
    features: [
      'Made with 100% Australian Beef',
      'Black pepper, coffee and cocoa rub',
      'Smoky hickory flavor',
      'Low and slow cooked'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        min: 900,
        max: 1200
      },
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      price: 249.99
    },
    inStock: true
  },
  {
    id: 'pulled-beef',
    name: 'Rich & Smoky Pulled Beef',
    category: ProductCategory.BEEF,
    description: 'Australian grain fed beef brisket cooked low and slow, seasoned with a black pepper, coffee and cocoa rub and a hint of smoky hickory, then hand pulled.',
    features: [
      'Made with 100% Australian Beef',
      'Hand pulled',
      'Black pepper, coffee and cocoa rub',
      'Smoky hickory flavor'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        exact: 1000
      },
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      weight: 10000,
      price: 279.99
    },
    inStock: true
  },
  {
    id: 'pork-ribs',
    name: 'Smoky & Sweet Pork Ribs',
    category: ProductCategory.PORK,
    description: 'Slow cooked in a smoky, sweet and sticky Louisiana style sauce, these Chef Cut Pork Ribs are juicier and have more meat than larger racks of ribs.',
    features: [
      'Made with 100% Australian Pork',
      'Louisiana style sauce',
      'Chef Cut ribs',
      'Extra juicy'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        min: 900,
        max: 1400
      },
      count: 2, // Two racks per unit
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 14,
      price: 299.99
    },
    inStock: true
  },
  {
    id: 'pulled-pork',
    name: 'Pulled Pork with a Little Kick',
    category: ProductCategory.PORK,
    description: 'Australian pork, cooked low and slow, seasoned with a mild chilli, tomato and vinegar rub reminiscent of Carolina\'s deep south, then hand pulled.',
    features: [
      'Made with 100% Australian Pork',
      'Carolina-style rub',
      'Hand pulled',
      'Mild chilli kick'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        exact: 1000
      },
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      weight: 10000,
      price: 259.99
    },
    inStock: true
  },
  {
    id: 'bbq-drumettes',
    name: 'Smoky, Sweet & Spiced BBQ Drumettes',
    category: ProductCategory.CHICKEN,
    description: 'Our Barbeque Chicken Wing Drumettes are an instant classic! The addictive flavour of the smoky, sweet, spiced barbeque sauce make eating just one simply impossible!',
    features: [
      'Made with 100% Australian Chicken',
      'Smoky, sweet BBQ sauce',
      'Spiced flavor profile',
      'Perfect portion size'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        exact: 1000
      },
      count: {
        min: 12,
        max: 14
      },
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      weight: 10000,
      price: 189.99
    },
    inStock: true
  },
  {
    id: 'buffalo-drumettes',
    name: 'Tangy & Buttery Buffalo Drumettes',
    category: ProductCategory.CHICKEN,
    description: 'The mildly spicy kick and the tangy, buttery flavour profile of our saucy Buffalo Chicken Wing Drumettes is deliciously addictive!',
    features: [
      'Made with 100% Australian Chicken',
      'Tangy buffalo sauce',
      'Buttery flavor',
      'Mild spicy kick'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        exact: 1000
      },
      count: {
        min: 12,
        max: 14
      },
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      weight: 10000,
      price: 189.99
    },
    inStock: true
  },
  {
    id: 'cheese-kransky',
    name: 'Smoky & Cheesy Big Cheese Kransky',
    category: ProductCategory.SPECIALTY,
    description: 'These big boys are stuffed with smoked pork and cheese with pepper and paprika bringing a bit of spice.',
    features: [
      'Made in Australia',
      'Stuffed with smoked pork and cheese',
      'Pepper and paprika seasoning',
      'Premium quality'
    ],
    origin: 'Australia',
    unit: {
      weight: {
        exact: 960
      },
      count: 10,
      format: 'Vacuum Sealed Pouch'
    },
    carton: {
      units: 10,
      weight: 9600,
      price: 159.99
    },
    inStock: true
  }
]; 