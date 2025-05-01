const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../app');

// Mock modules
jest.mock('bcryptjs');

// Setup and teardown
beforeAll(async () => {
  // Connect to a test database or mock the connection
  await mongoose.disconnect(); // Ensure disconnected
  await mongoose.connect('mongodb://127.0.0.1:27017/test-event-management_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

afterAll(async () => {
  // Clean up and close connection
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  // Clear the database before each test
  await mongoose.connection.db.dropDatabase();
  
  // Mock bcrypt hash function
  bcrypt.hash.mockResolvedValue('hashed_cvc_123');
});

// Test cases for /create endpoint
describe('POST /create', () => {
  const validPaymentData = {
    cardNumber: '4111111111111111', // Visa card number
    cardHolderName: 'John Doe',
    dateOfIssue: '01/20',
    dateOfExpiry: '01/25',
    cvc: '123',
    attendee: 'johndoe'
  };

  test('should create a new payment record with valid data', async () => {
    const response = await request(app)
      .post('/create')
      .send(validPaymentData)
      .expect(200);
    
    expect(response.body.message).toBe('Payment created successfully');
    expect(response.body.payment).toHaveProperty('cardNumber', validPaymentData.cardNumber);
    expect(response.body.payment).toHaveProperty('cardType', 'Visa');
  });

  test('should return 500 when required fields are missing', async () => {
    const invalidData = { ...validPaymentData };
    delete invalidData.cardNumber;
    
    const response = await request(app)
      .post('/create')
      .send(invalidData)
      .expect(500);
    
    expect(response.body.message).toBe('Some required fields are missing');
  });

  test('should return 400 when user already has the same card', async () => {
    // First create a payment
    await request(app)
      .post('/create')
      .send(validPaymentData)
      .expect(200);
    
    // Try to create the same payment again
    const response = await request(app)
      .post('/create')
      .send(validPaymentData)
      .expect(400);
    
    expect(response.body.message).toBe('This card is already added by the user.');
  });

  test('should correctly identify card type as MasterCard', async () => {
    const masterCardData = {
      ...validPaymentData,
      cardNumber: '5111111111111111' // MasterCard number
    };

    const response = await request(app)
      .post('/create')
      .send(masterCardData)
      .expect(200);
    
    expect(response.body.payment).toHaveProperty('cardType', 'MasterCard');
  });

  test('should correctly identify card type as American Express', async () => {
    const amexData = {
      ...validPaymentData,
      cardNumber: '371111111111111' // AmEx number
    };

    const response = await request(app)
      .post('/create')
      .send(amexData)
      .expect(200);
    
    expect(response.body.payment).toHaveProperty('cardType', 'American Express');
  });

  test('should correctly identify card type as Discover', async () => {
    const discoverData = {
      ...validPaymentData,
      cardNumber: '6111111111111111' // Discover number
    };

    const response = await request(app)
      .post('/create')
      .send(discoverData)
      .expect(200);
    
    expect(response.body.payment).toHaveProperty('cardType', 'Discover');
  });

  test('should correctly identify unknown card type', async () => {
    const unknownCardData = {
      ...validPaymentData,
      cardNumber: '9111111111111111' // Unknown card type
    };

    const response = await request(app)
      .post('/create')
      .send(unknownCardData)
      .expect(200);
    
    expect(response.body.payment).toHaveProperty('cardType', 'Unknown');
  });

  test('should handle DB errors and return 500', async () => {
    // Mock mongoose save method to throw error
    jest.spyOn(mongoose.Model.prototype, 'save').mockImplementationOnce(() => {
      throw new Error('DB error');
    });

    const response = await request(app)
      .post('/create')
      .send(validPaymentData)
      .expect(500);
    
    expect(response.body.message).toBe('DB error');
  });
});

// Test cases for /delete endpoint
describe('DELETE /delete', () => {
  const paymentData = {
    cardNumber: '4111111111111111',
    cardHolderName: 'John Doe',
    dateOfIssue: '01/20',
    dateOfExpiry: '01/25',
    cvc: '123',
    attendee: 'johndoe'
  };

  beforeEach(async () => {
    // Create a payment record to delete in each test
    await request(app)
      .post('/create')
      .send(paymentData);
  });

  test('should delete payment record with valid data', async () => {
    const deleteData = {
      username: 'johndoe',
      cardNumber: '4111111111111111'
    };

    const response = await request(app)
      .delete('/delete')
      .send(deleteData)
      .expect(200);
    
    expect(response.body.message).toBe('Payment deleted successfully');
  });

  test('should return 404 when payment not found', async () => {
    const deleteData = {
      username: 'nonexistentuser',
      cardNumber: '4111111111111111'
    };

    const response = await request(app)
      .delete('/delete')
      .send(deleteData)
      .expect(404);
    
    expect(response.body.message).toBe('Payment not found with the given username and card number');
  });

  test('should handle DB errors on delete', async () => {
    // Mock mongoose findOneAndDelete method to throw error
    jest.spyOn(mongoose.Model, 'findOneAndDelete').mockImplementationOnce(() => {
      throw new Error('DB delete error');
    });

    const deleteData = {
      username: 'johndoe',
      cardNumber: '4111111111111111'
    };

    const response = await request(app)
      .delete('/delete')
      .send(deleteData)
      .expect(500);
    
    expect(response.body.error).toBeDefined();
  });
});

// Test cases for /get-by-attendee/:username endpoint
describe('GET /get-by-attendee/:username', () => {
  const paymentData = {
    cardNumber: '4111111111111111',
    cardHolderName: 'John Doe',
    dateOfIssue: '01/20',
    dateOfExpiry: '01/25',
    cvc: '123',
    attendee: 'johndoe'
  };

  beforeEach(async () => {
    // Create a payment record to retrieve in tests
    await request(app)
      .post('/create')
      .send(paymentData);
  });

  test('should retrieve payments for existing attendee', async () => {
    const response = await request(app)
      .get('/get-by-attendee/johndoe')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(1);
    expect(response.body[0]).toHaveProperty('cardNumber', paymentData.cardNumber);
  });

  test('should return 404 when no payments found for attendee', async () => {
    const response = await request(app)
      .get('/get-by-attendee/nonexistentuser')
      .expect(404);
    
    expect(response.body.message).toBe('No payments found for this attendee');
  });

  test('should handle DB errors in get-by-attendee', async () => {
    // Mock mongoose find method to throw error
    jest.spyOn(mongoose.Model, 'find').mockImplementationOnce(() => {
      throw new Error('DB find error');
    });

    const response = await request(app)
      .get('/get-by-attendee/johndoe')
      .expect(500);
    
    expect(response.body.error).toBeDefined();
  });
});

// Test multiple cards for same user scenario
describe('Multiple cards for same user', () => {
  const firstCard = {
    cardNumber: '4111111111111111', // Visa
    cardHolderName: 'John Doe',
    dateOfIssue: '01/20',
    dateOfExpiry: '01/25',
    cvc: '123',
    attendee: 'johndoe'
  };

  const secondCard = {
    cardNumber: '5111111111111111', // MasterCard
    cardHolderName: 'John Doe',
    dateOfIssue: '01/20',
    dateOfExpiry: '01/25',
    cvc: '123',
    attendee: 'johndoe'
  };

  test('should allow user to add multiple different cards', async () => {
    // Add first card
    await request(app)
      .post('/create')
      .send(firstCard)
      .expect(200);
    
    // Add second card
    await request(app)
      .post('/create')
      .send(secondCard)
      .expect(200);
    
    // Check that user has two cards
    const response = await request(app)
      .get('/get-by-attendee/johndoe')
      .expect(200);
    
    expect(Array.isArray(response.body)).toBeTruthy();
    expect(response.body.length).toBe(2);
    
    // Verify card types are correctly identified
    const cardTypes = response.body.map(card => card.cardType);
    expect(cardTypes).toContain('Visa');
    expect(cardTypes).toContain('MasterCard');
  });
});