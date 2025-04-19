import Database from '../config/database';
import { Product } from '../models/Product';
import { Customer } from '../models/Customer';
import { Order, OrderStatus, PaymentStatus } from '../models/Order';

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  const db = Database.getInstance();
  await db.connect();
  console.log('✅ Database connection successful');
}

async function testProductModel() {
  console.log('\nTesting Product model...');
  try {
    const testProduct = new Product({
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
    });

    await testProduct.save();
    console.log('✅ Product creation successful');

    const foundProduct = await Product.findOne({ id: 'TEST-PROD-001' });
    console.log('✅ Product retrieval successful');

    await Product.deleteOne({ id: 'TEST-PROD-001' });
    console.log('✅ Product deletion successful');
  } catch (error) {
    console.error('❌ Product model test failed:', error);
    throw error;
  }
}

async function testCustomerModel() {
  console.log('\nTesting Customer model...');
  try {
    const testCustomer = new Customer({
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
    });

    await testCustomer.save();
    console.log('✅ Customer creation successful');

    const foundCustomer = await Customer.findByPhone('+61400000000');
    console.log('✅ Customer retrieval successful');

    await testCustomer.addAddress({
      street: '456 Test Ave',
      city: 'Melbourne',
      state: 'VIC',
      postcode: '3000',
      country: 'Australia'
    });
    console.log('✅ Customer address addition successful');

    await Customer.deleteOne({ id: 'TEST-CUST-001' });
    console.log('✅ Customer deletion successful');
  } catch (error) {
    console.error('❌ Customer model test failed:', error);
    throw error;
  }
}

async function testOrderModel() {
  console.log('\nTesting Order model...');
  try {
    const testOrder = new Order({
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
    });

    await testOrder.save();
    console.log('✅ Order creation successful');

    await testOrder.updateStatus(OrderStatus.CONFIRMED, 'Test confirmation');
    console.log('✅ Order status update successful');

    await testOrder.updatePaymentStatus(PaymentStatus.PAID);
    console.log('✅ Order payment status update successful');

    await Order.deleteOne({ id: 'TEST-ORDER-001' });
    console.log('✅ Order deletion successful');
  } catch (error) {
    console.error('❌ Order model test failed:', error);
    throw error;
  }
}

async function runTests() {
  try {
    console.log('Starting database tests...\n');
    await testDatabaseConnection();
    await testProductModel();
    await testCustomerModel();
    await testOrderModel();
    console.log('\n✅ All tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Tests failed:', error);
    process.exit(1);
  }
}

runTests(); 