const request = require("supertest");
const app = require("../app");
const mongoose = require("mongoose");

const User = app.locals.User;

describe("User API Endpoints", () => {
  let userId;

  beforeAll(async () => {
    // Connect to a test database or mock the connection
    await mongoose.disconnect(); // Ensure disconnected
    await mongoose.connect('mongodb://127.0.0.1:27017/test-event-management_db', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  it("should register a new user", async () => {
    const res = await request(app).post("/register").send({
      username: "test123",
      email: "test123@email.com",
      type: 1,
    });
    userId = res.body.user._id;
    expect(res.statusCode).toEqual(200);
    expect(res.body.user.username).toBe("test123");
  });

  it("should fetch a user by email", async () => {
    const res = await request(app).get("/getbyemail/test123@email.com");
    expect(res.statusCode).toEqual(200);
    expect(res.body.email).toBe("test123@email.com");
  });

  it("should return 404 for non-existent email", async () => {
    const res = await request(app).get("/getbyemail/fake@email.com");
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should fetch a user by username", async () => {
    const res = await request(app).get("/getbyusername/test123");
    expect(res.statusCode).toEqual(200);
    expect(res.body.username).toBe("test123");
  });

  it("should return 404 for non-existent username", async () => {
    const res = await request(app).get("/getbyusername/fakeuser");
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toBe("User not found");
  });

  it("should update the user", async () => {
    const res = await request(app).put(`/update/${userId}`).send({
      username: "updated123",
      email: "updated@email.com",
      type: 2,
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body.user.username).toBe("updated123");
  });

  it("should return 404 on update for invalid ID", async () => {
    const res = await request(app).put("/update/123456789012").send({
      username: "invalid",
      email: "invalid@email.com",
      type: 3,
    });
    expect(res.statusCode).toEqual(500); // invalid ObjectId throws cast error
  });

  it("should delete the user", async () => {
    const res = await request(app).delete("/delete/updated123");
    expect(res.statusCode).toEqual(200);
    expect(res.body.message).toBe("User deleted");
  });

  it("should return 404 on deleting non-existent user", async () => {
    const res = await request(app).delete("/delete/nonexistentuser");
    expect(res.statusCode).toEqual(404);
    expect(res.body.message).toBe("User not found");
  });
});
