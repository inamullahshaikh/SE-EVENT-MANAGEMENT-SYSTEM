const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const axios = require('axios');
const app = require('../app');

// Mock axios
jest.mock('axios');

// Attendee Model - mocking but keeping the same structure as in app.js
let Attendee;
const setupAttendeeModel = () => {
  try {
    // If the model exists, use it
    Attendee = mongoose.model('Attendee');
    return Attendee;
  } catch (error) {
    // If not, create a new model
    const attendeeSchema = new mongoose.Schema({
      name: String,
      username: String,
      email: String,
      password: String,
      phone: String,
      loyaltyPoints: { type: Number, default: 0 },
      resetCode: String,
      resetCodeExpiry: Date,
    });
    
    Attendee = mongoose.model('Attendee', attendeeSchema);
    return Attendee;
  }
};

describe('Attendee Service API Tests', () => {
  let server;
  
  // Setup and teardown
  beforeAll(async () => {
    // Use a unique database name to avoid conflicts
    
    const dbName = `test-event-management-${Date.now()}`;
   
    
    
    // Connect to a test database with proper options
    await mongoose.disconnect(); // Ensure disconnected
    
    try {
      await mongoose.connect(`mongodb://127.0.0.1:27017/${dbName}`, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error; // Let Jest know the setup failed
    }
    
    // Setup the Attendee model
    Attendee = setupAttendeeModel();
    
    // Start the server
    server = app.listen(0); // Use a random port
  });

  afterAll(async () => {
    // Close server and database connection
    if (server) {
      await server.close();
    }
    
    // Clean up database and close connection
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase();
      await mongoose.connection.close();
    }
  });

  beforeEach(async () => {
    // Clear database before each test
    await Attendee.deleteMany({});
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  // Helper function to create a test attendee
  const createTestAttendee = async () => {
    const hashedPassword = await bcrypt.hash('password123', 10);
    const attendee = new Attendee({
      name: 'Test User',
      username: 'testuser',
      email: 'test@example.com',
      password: hashedPassword,
      phone: '1234567890',
      loyaltyPoints: 10
    });
    await attendee.save();
    return attendee;
  };

  // Tests for /register endpoint
  describe('POST /register', () => {
    test('should register a new attendee successfully', async () => {
      // Mock responses from other services
      axios.get.mockImplementation((url) => {
        if (url.includes('/getbyemail/') || url.includes('/getbyusername/')) {
          return Promise.resolve({ data: null });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });
      
      axios.post.mockResolvedValue({ data: {} });

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          username: 'newuser',
          email: 'new@example.com',
          password: 'securepass',
          phone: '9876543210'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Attendee registered');
      
      // Verify database entry
      const attendee = await Attendee.findOne({ username: 'newuser' });
      expect(attendee).not.toBeNull();
      expect(attendee.email).toBe('new@example.com');
      
      // Verify other service calls
      expect(axios.post).toHaveBeenCalledTimes(2);
      expect(axios.post.mock.calls[0][0]).toBe('http://localhost:3000/register');
      expect(axios.post.mock.calls[1][0]).toBe('http://localhost:3005/send');
    });

    test('should return error when username already exists', async () => {
      // Mock response that user exists
      axios.get.mockImplementation((url) => {
        if (url.includes('/getbyusername/')) {
          return Promise.resolve({ data: { username: 'existinguser' } });
        }
        if (url.includes('/getbyemail/')) {
          return Promise.resolve({ data: null });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          username: 'existinguser',
          email: 'new@example.com',
          password: 'securepass',
          phone: '9876543210'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    test('should return error when email already exists', async () => {
      // Mock response that email exists
      axios.get.mockImplementation((url) => {
        if (url.includes('/getbyemail/')) {
          return Promise.resolve({ data: { email: 'existing@example.com' } });
        }
        if (url.includes('/getbyusername/')) {
          return Promise.resolve({ data: null });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          username: 'newuser',
          email: 'existing@example.com',
          password: 'securepass',
          phone: '9876543210'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already exists');
    });

    test('should handle server errors during registration', async () => {
      // Mock axios to throw an error
      axios.get.mockResolvedValue({ data: null });
      axios.post.mockRejectedValue(new Error('Service unavailable'));

      const response = await request(app)
        .post('/register')
        .send({
          name: 'New User',
          username: 'newuser',
          email: 'new@example.com',
          password: 'securepass',
          phone: '9876543210'
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBeDefined();
    });
  });

  // Tests for /login endpoint
  describe('POST /login', () => {
    test('should login successfully with correct username and password', async () => {
      await createTestAttendee();

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('type', 2);
    });

    test('should login successfully with correct email and password', async () => {
      await createTestAttendee();

      const response = await request(app)
        .post('/login')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('type', 2);
    });

    test('should return 404 when attendee not found', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    test('should return 401 when password is incorrect', async () => {
      await createTestAttendee();

      const response = await request(app)
        .post('/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  // Tests for /update/:username endpoint
  describe('PUT /update/:username', () => {
    test('should update password successfully', async () => {
      const attendee = await createTestAttendee();
      
      // Mock axios responses
      axios.get.mockResolvedValue({ data: { _id: 'user123' } });
      axios.put.mockResolvedValue({ data: {} });

      const response = await request(app)
        .put('/update/testuser')
        .send({
          password: 'newpassword123'
        });

      expect(response.status).toBe(200);
      
      // Verify password was updated and hashed
      const updatedAttendee = await Attendee.findById(attendee._id);
      const passwordMatches = await bcrypt.compare('newpassword123', updatedAttendee.password);
      expect(passwordMatches).toBe(true);
    });

    test('should update loyalty points successfully', async () => {
      const attendee = await createTestAttendee();
      
      // Mock axios responses
      axios.get.mockResolvedValue({ data: { _id: 'user123' } });
      axios.put.mockResolvedValue({ data: {} });

      const response = await request(app)
        .put('/update/testuser')
        .send({
          loyaltyPoints: 50
        });

      expect(response.status).toBe(200);
      
      // Verify loyalty points updated
      const updatedAttendee = await Attendee.findById(attendee._id);
      expect(updatedAttendee.loyaltyPoints).toBe(50);
    });

    test('should return 404 when attendee not found', async () => {
      // Mock axios responses
      axios.get.mockResolvedValue({ data: null });
      
      const response = await request(app)
        .put('/update/nonexistent')
        .send({
          name: 'Updated Name'
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    test('should return 400 when email is already in use', async () => {
      await createTestAttendee();
      
      // Create another attendee
      const anotherAttendee = new Attendee({
        name: 'Another User',
        username: 'anotheruser',
        email: 'another@example.com',
        password: await bcrypt.hash('password123', 10),
        phone: '9999999999'
      });
      await anotherAttendee.save();
      
      // Mock email check to return a user
      axios.get.mockImplementation((url) => {
        if (url.includes('/getbyemail/another@example.com')) {
          return Promise.resolve({ data: { email: 'another@example.com' } });
        }
        return Promise.resolve({ data: null });
      });

      const response = await request(app)
        .put('/update/testuser')
        .send({
          email: 'another@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Email already in use');
    });
  });

  // Tests for /delete/:username endpoint
  describe('DELETE /delete/:username', () => {
    test('should delete attendee successfully', async () => {
      await createTestAttendee();
      
      // Mock user service delete
      axios.delete.mockResolvedValue({ data: {} });

      const response = await request(app)
        .delete('/delete/testuser');

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('Attendee deleted');
      
      // Verify attendee was deleted from database
      const deletedAttendee = await Attendee.findOne({ username: 'testuser' });
      expect(deletedAttendee).toBeNull();
      
      // Verify user service was called
      expect(axios.delete).toHaveBeenCalledWith('http://localhost:3000/delete/testuser');
    });

    test('should return 404 when attendee not found', async () => {
      const response = await request(app)
        .delete('/delete/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });

    test('should handle errors from user service', async () => {
      await createTestAttendee();
      
      // Mock user service to throw error
      axios.delete.mockRejectedValue(new Error('User service unavailable'));

      const response = await request(app)
        .delete('/delete/testuser');

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  // Tests for /getbyusername/:username endpoint
  describe('GET /getbyusername/:username', () => {
    test('should return attendee when found', async () => {
      const attendee = await createTestAttendee();

      const response = await request(app)
        .get('/getbyusername/testuser');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('name', 'Test User');
    });

    test('should return 404 when attendee not found', async () => {
      const response = await request(app)
        .get('/getbyusername/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  // Tests for /getbyemail/:email endpoint
  describe('GET /getbyemail/:email', () => {
    test('should return attendee when found', async () => {
      const attendee = await createTestAttendee();

      const response = await request(app)
        .get('/getbyemail/test@example.com');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('username', 'testuser');
      expect(response.body).toHaveProperty('email', 'test@example.com');
      expect(response.body).toHaveProperty('name', 'Test User');
    });

    test('should return 404 when attendee not found', async () => {
      const response = await request(app)
        .get('/getbyemail/nonexistent@example.com');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });
// Add these tests to your existing file to improve function coverage

// Tests for error handlers and edge cases
describe('Error Handling Tests', () => {
  // Test for server errors in login
  test('should handle server errors during login', async () => {
    await createTestAttendee();
    
    // Mock Mongoose findOne to throw an error
    const originalFindOne = Attendee.findOne;
    Attendee.findOne = jest.fn().mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const response = await request(app)
      .post('/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    // Restore original function after test
    Attendee.findOne = originalFindOne;
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
  
  // Test for server errors in getbyusername
  test('should handle server errors when getting attendee by username', async () => {
    // Mock Mongoose findOne to throw an error
    const originalFindOne = Attendee.findOne;
    Attendee.findOne = jest.fn().mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const response = await request(app)
      .get('/getbyusername/testuser');
    
    // Restore original function after test
    Attendee.findOne = originalFindOne;
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
  
  // Test for server errors in getbyemail
  test('should handle server errors when getting attendee by email', async () => {
    // Mock Mongoose findOne to throw an error
    const originalFindOne = Attendee.findOne;
    Attendee.findOne = jest.fn().mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const response = await request(app)
      .get('/getbyemail/test@example.com');
    
    // Restore original function after test
    Attendee.findOne = originalFindOne;
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

// Additional tests for update endpoint
describe('Additional PUT /update/:username Tests', () => {
  test('should update name and phone successfully', async () => {
    const attendee = await createTestAttendee();
    
    // Mock axios responses
    axios.get.mockResolvedValue({ data: { _id: 'user123' } });
    axios.put.mockResolvedValue({ data: {} });

    const response = await request(app)
      .put('/update/testuser')
      .send({
        name: 'Updated Name',
        phone: '5555555555'
      });

    expect(response.status).toBe(200);
    
    // Verify name and phone updated
    const updatedAttendee = await Attendee.findById(attendee._id);
    expect(updatedAttendee.name).toBe('Updated Name');
    expect(updatedAttendee.phone).toBe('5555555555');
  });
  
  test('should handle server errors during update', async () => {
    await createTestAttendee();
    
    // Mock findOne but throw error on findByIdAndUpdate
    const originalFindByIdAndUpdate = Attendee.findByIdAndUpdate;
    Attendee.findByIdAndUpdate = jest.fn().mockImplementation(() => {
      throw new Error('Database error');
    });
    
    const response = await request(app)
      .put('/update/testuser')
      .send({
        name: 'Updated Name'
      });
    
    // Restore original function
    Attendee.findByIdAndUpdate = originalFindByIdAndUpdate;
    
    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
  
  test('should handle errors from user service during update', async () => {
    await createTestAttendee();
    
    // Mock axios to throw error on put
    axios.get.mockResolvedValue({ data: { _id: 'user123' } });
    axios.put.mockRejectedValue(new Error('User service unavailable'));

    const response = await request(app)
      .put('/update/testuser')
      .send({
        name: 'Updated Name'
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });
});

// Test email verification service connection
describe('Email Service Integration Tests', () => {
  test('should handle errors when email service is unavailable during registration', async () => {
    // Make user service checks pass
    axios.get.mockResolvedValue({ data: null });
    // Make user service registration pass
    axios.post.mockImplementation((url) => {
      if (url === 'http://localhost:3000/register') {
        return Promise.resolve({ data: {} });
      }
      // But make email service fail
      if (url === 'http://localhost:3005/send') {
        return Promise.reject(new Error('Email service unavailable'));
      }
      return Promise.reject(new Error('Unexpected URL'));
    });

    const response = await request(app)
      .post('/register')
      .send({
        name: 'New User',
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass',
        phone: '9876543210'
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('Email service unavailable');
  });
});
// Add these additional test cases to increase function and line coverage

describe('Additional Coverage Tests', () => {
  // Test for handling case when user-service is down during registration check
  test('should handle user service unavailability during username check', async () => {
    // Mock axios to throw error specifically for the username check
    axios.get.mockImplementation((url) => {
      if (url.includes('/getbyemail/')) {
        return Promise.resolve({ data: null });
      }
      if (url.includes('/getbyusername/')) {
        return Promise.reject(new Error('User service unavailable'));
      }
      return Promise.reject(new Error('Unexpected URL'));
    });
    
    const response = await request(app)
      .post('/register')
      .send({
        name: 'New User',
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass',
        phone: '9876543210'
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBeDefined();
  });

  // Test for handling case when user-service is down during email check
  test('should handle user service unavailability during email check', async () => {
    // Mock axios to throw error specifically for the email check
    axios.get.mockImplementation((url) => {
      if (url.includes('/getbyemail/')) {
        return Promise.reject(new Error('User service unavailable'));
      }
      return Promise.resolve({ data: null });
    });
    
    const response = await request(app)
      .post('/register')
      .send({
        name: 'New User',
        username: 'newuser',
        email: 'new@example.com',
        password: 'securepass',
        phone: '9876543210'
      });

    expect(response.status).toBe(500);
    expect(response.body.message).toBeDefined();
  });

  // Test for handling errors in update endpoint when user service getbyusername fails
  test('should handle errors when user service getbyusername fails during update', async () => {
    await createTestAttendee();
    
    // Mock axios to throw error on get
    axios.get.mockRejectedValue(new Error('User service unavailable'));

    const response = await request(app)
      .put('/update/testuser')
      .send({
        email: 'newemail@example.com'
      });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('error');
  });

  // Test for the case when user service returns an error during update
  test('should handle case when user service fails during getting username in update', async () => {
    await createTestAttendee();
    
    // First succeed with email check, then fail with getbyusername
    let callCount = 0;
    axios.get.mockImplementation((url) => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ data: null });
      } else {
        return Promise.reject(new Error('User service unavailable'));
      }
    });
    
    const response = await request(app)
      .put('/update/testuser')
      .send({
        email: 'newemail@example.com'
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });

  // Test the registration flow where password hashing occurs
  test('should correctly hash password during registration', async () => {
    // Mock responses from other services
    axios.get.mockResolvedValue({ data: null });
    axios.post.mockResolvedValue({ data: {} });

    const plainPassword = 'securepassword123';
    
    const response = await request(app)
      .post('/register')
      .send({
        name: 'Hash Test User',
        username: 'hashuser',
        email: 'hash@example.com',
        password: plainPassword,
        phone: '1231231234'
      });

    expect(response.status).toBe(200);
    
    // Verify password was hashed
    const savedAttendee = await Attendee.findOne({ username: 'hashuser' });
    expect(savedAttendee).not.toBeNull();
    expect(savedAttendee.password).not.toBe(plainPassword);
    
    // Verify the password can be compared correctly
    const passwordMatches = await bcrypt.compare(plainPassword, savedAttendee.password);
    expect(passwordMatches).toBe(true);
  });

  // Test for error during password hashing in registration
  test('should handle errors during password hashing in registration', async () => {
    // Mock bcrypt.hash to throw an error
    const originalHash = bcrypt.hash;
    bcrypt.hash = jest.fn().mockImplementation(() => {
      throw new Error('Hashing error');
    });
    
    axios.get.mockResolvedValue({ data: null });
    
    const response = await request(app)
      .post('/register')
      .send({
        name: 'Hash Error User',
        username: 'hasherror',
        email: 'hasherror@example.com',
        password: 'password123',
        phone: '1231231234'
      });
    
    // Restore original function
    bcrypt.hash = originalHash;
    
    expect(response.status).toBe(500);
    expect(response.body.message).toBeDefined();
  });

  // Test for error during password hashing in update
  test('should handle errors during password hashing in update', async () => {
    await createTestAttendee();
    
    // Mock bcrypt.hash to throw an error
    const originalHash = bcrypt.hash;
    bcrypt.hash = jest.fn().mockImplementation(() => {
      throw new Error('Hashing error');
    });
    
    const response = await request(app)
      .put('/update/testuser')
      .send({
        password: 'newpassword123'
      });
    
    // Restore original function
    bcrypt.hash = originalHash;
    
    expect(response.status).toBe(500);
    expect(response.body.error).toBeDefined();
  });
});
});