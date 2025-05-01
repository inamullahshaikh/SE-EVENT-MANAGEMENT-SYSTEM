const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../app");
const Query = mongoose.model("Query");

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
  await Query.deleteMany();
});

describe("Queries API (Local DB)", () => {
  it("should create a new query", async () => {
    const res = await request(app).post("/createquestion").send({
      name: "Aden",
      email: "aden@example.com",
      question: "What is the schedule?",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.query.name).toBe("Aden");
    expect(res.body.query.email).toBe("aden@example.com");
  });

  it("should return error if required fields are missing", async () => {
    const res = await request(app).post("/createquestion").send({
      name: "Aden",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Name, email, and question are required");
  });

  it("should get all queries", async () => {
    await Query.create({
      name: "John",
      email: "john@example.com",
      question: "What is the dress code?",
    });

    const res = await request(app).get("/getallqueries");
    expect(res.statusCode).toBe(200);
    expect(res.body.allQueries.length).toBe(1);
  });

  it("should get all unanswered queries", async () => {
    await Query.create([
      {
        name: "User A",
        email: "a@mail.com",
        question: "Unanswered?",
        answer: null,
      },
      {
        name: "User B",
        email: "b@mail.com",
        question: "Answered?",
        answer: "Yes",
      },
    ]);

    const res = await request(app).get("/getallunansweredqueries");
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].answer).toBe(null);
  });

  

  it("should return 404 if query not found", async () => {
    const nonExistentId = new mongoose.Types.ObjectId();
    const res = await request(app).post("/answerquestion").send({
      queryId: nonExistentId,
      answer: "Answer",
    });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Query not found");
  });

  it("should return error if answer data is missing", async () => {
    const res = await request(app).post("/answerquestion").send({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Query ID and answer are required");
  });
});
