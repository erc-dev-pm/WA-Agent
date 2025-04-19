import Database from '../config/database';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order, OrderStatus, PaymentStatus } from '../models/Order';

describe('Database Tests', () => {
  beforeAll(async () => {
    const db = Database.getInstance();
    await db.connect();
  });

  afterAll(async () => {
    await Database.getInstance().disconnect();
  });

  describe('Product Model', () => {
    const testProduct = {
      id: 'TEST-PROD-001',
      name: 'Test Chocolate Bar',
      description: 'A delicious test chocolate bar',
      category: 'Chocolates',
      price: 5.99,
      unit: {
        format: 'bar',
        weight: { exact: 100 }
      },
      carton: {
        units: 24,
        weight: 2.4
      },
      features: ['Dark chocolate', 'Test feature']
    };

    it('should create and retrieve a product', async () => {
      const product = new Product(testProduct);
      await product.save();

      const foundProduct = await Product.findOne({ id: testProduct.id });
      expect(foundProduct).toBeDefined();
      expect(foundProduct?.id).toBe(testProduct.id);
      expect(foundProduct?.name).toBe(testProduct.name);
      expect(foundProduct?.price).toBe(testProduct.price);

      await Product.deleteOne({ id: testProduct.id });
    });
  });

  describe('Customer Model', () => {
    const testCustomer = {
      id: 'TEST-CUST-001',
      phoneNumber: '+61400000000',
      name: 'Test Customer',
      email: 'test@example.com',
      addresses: [{
        street: '123 Test St',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }]
    };

    it('should create and retrieve a customer', async () => {
      const customer = new Customer(testCustomer);
      await customer.save();

      const foundCustomer = await Customer.findByPhone(testCustomer.phoneNumber);
      expect(foundCustomer).toBeDefined();
      expect(foundCustomer?.phoneNumber).toBe(testCustomer.phoneNumber);
      expect(foundCustomer?.name).toBe(testCustomer.name);
      expect(foundCustomer?.addresses).toHaveLength(1);
      expect(foundCustomer?.addresses[0].street).toBe(testCustomer.addresses[0].street);

      await Customer.deleteOne({ id: testCustomer.id });
    });

    it('should add a new address to customer', async () => {
      const customer = new Customer(testCustomer);
      await customer.save();

      const newAddress = {
        street: '456 Test Ave',
        city: 'Melbourne',
        state: 'VIC',
        postcode: '3000',
        country: 'Australia'
      };

      await customer.addAddress(newAddress);
      expect(customer.addresses).toHaveLength(2);
      expect(customer.addresses[1]).toMatchObject(newAddress);

      await Customer.deleteOne({ id: testCustomer.id });
    });
  });

  describe('Order Model', () => {
    const testOrder = {
      id: 'TEST-ORDER-001',
      customerId: 'TEST-CUST-001',
      items: [{
        productId: 'TEST-PROD-001',
        quantity: 2,
        price: 5.99,
        total: 11.98
      }],
      totalAmount: 11.98,
      deliveryAddress: {
        street: '123 Test St',
        city: 'Sydney',
        state: 'NSW',
        postcode: '2000',
        country: 'Australia'
      }
    };

    it('should create and update order status', async () => {
      const order = new Order(testOrder);
      await order.save();

      await order.updateStatus(OrderStatus.CONFIRMED, 'Test confirmation');
      expect(order.status).toBe(OrderStatus.CONFIRMED);

      await order.updatePaymentStatus(PaymentStatus.PAID);
      expect(order.paymentStatus).toBe(PaymentStatus.PAID);

      await Order.deleteOne({ id: testOrder.id });
    });
  });
}); 