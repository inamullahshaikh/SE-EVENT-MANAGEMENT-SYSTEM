const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app"); // adjust if path differs
const Feedback = mongoose.model("event-feedback");
beforeAll(async () => {
  // Connect to a test database or mock the connection
  await mongoose.disconnect(); // Ensure disconnected
  await mongoose.connect('mongodb://127.0.0.1:27017/test-event-management_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});
afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await Feedback.deleteMany({});
});

describe("Feedback API (local DB)", () => {
  it("should create feedback successfully", async () => {
    const res = await request(app)
      .post("/create-feedback")
      .send({
        username: "john_doe",
        eventid: "event123",
        bookingid: "booking456",
        rating: 5,
        comment: "Great event!",
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.feedback.rating).toBe(5);
  });

  it("should fail to create feedback with invalid rating", async () => {
    const res = await request(app).post("/create-feedback").send({
      username: "bad_user",
      rating: 6,
      comment: "Invalid rating",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("should fetch all feedback", async () => {
    await Feedback.create({
      username: "user1",
      eventid: "e1",
      rating: 4,
      comment: "Nice",
    });

    const res = await request(app).get("/get-feedback");
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should fetch feedback by event ID", async () => {
    await Feedback.create({
      username: "user2",
      eventid: "eventX",
      rating: 3,
      comment: "Decent",
    });

    const res = await request(app).get("/get-feedback/eventX");
    expect(res.statusCode).toBe(200);
    expect(res.body[0].eventid).toBe("eventX");
  });

  it("should fetch feedback by booking ID", async () => {
    await Feedback.create({
      username: "user3",
      bookingid: "booking789",
      rating: 2,
      comment: "Okay",
    });

    const res = await request(app).get("/get-event-by-booking/booking789");
    expect(res.statusCode).toBe(200);
    expect(res.body.bookingid).toBe("booking789");
  });

  it("should return 404 for feedback by invalid booking ID", async () => {
    const res = await request(app).get("/get-event-by-booking/invalid-id");
    expect(res.statusCode).toBe(404);
  });

  it("should delete feedback by ID", async () => {
    const feedback = await Feedback.create({
      username: "deleteme",
      rating: 1,
      comment: "Bad",
    });

    const res = await request(app).delete(`/delete-feedback/${feedback._id}`);
    expect(res.statusCode).toBe(200);
  });

  it("should return error for invalid delete ID", async () => {
    const res = await request(app).delete("/delete-feedback/not-an-id");
    expect(res.statusCode).toBe(400);
  });
});
