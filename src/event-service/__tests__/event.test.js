const request = require("supertest");
const mongoose = require("mongoose");
const axios = require("axios");
const app = require("../app");

const Event = mongoose.model("Event");
const Booking = mongoose.model("Booking");

jest.mock("axios");

beforeAll(async () => {
  // Connect to a test database or mock the connection
  await mongoose.disconnect(); // Ensure disconnected
  await mongoose.connect('mongodb://127.0.0.1:27017/test-event-management_db', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});
afterEach(async () => {
  await Event.deleteMany({});
  await Booking.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});


afterEach(async () => {
  await Event.deleteMany({});
  await Booking.deleteMany({});
});

describe("Event Service API", () => {
  const mockOrganizer = { data: { username: "testorg" } };

  describe("POST /create", () => {
    it("should create a valid event", async () => {
      axios.get.mockResolvedValueOnce(mockOrganizer);
      const res = await request(app).post("/create").send({
        name: "Test Event",
        venue: "Test Venue",
        date: new Date(Date.now() + 86400000),
        numberOfTickets: 100,
        pricePerTicket: 50,
        eventOrg: "testorg",
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("Event created successfully");
    });

    it("should reject if event organizer not found", async () => {
      axios.get.mockResolvedValueOnce({ data: null });
      const res = await request(app).post("/create").send({
        name: "Test Event",
        venue: "Test Venue",
        date: new Date(Date.now() + 86400000),
        numberOfTickets: 100,
        pricePerTicket: 50,
        eventOrg: "nonexistent",
      });
      expect(res.statusCode).toBe(404);
    });

    it("should reject if event date is in the past", async () => {
      axios.get.mockResolvedValueOnce(mockOrganizer);
      const res = await request(app).post("/create").send({
        name: "Old Event",
        venue: "Old Venue",
        date: new Date(Date.now() - 86400000),
        numberOfTickets: 100,
        pricePerTicket: 50,
        eventOrg: "testorg",
      });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /get", () => {
    it("should return all events", async () => {
      await Event.create({ name: "A", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "testorg" });
      const res = await request(app).get("/get");
      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe("GET /get/:id", () => {
    it("should return an event by ID", async () => {
      const evt = await Event.create({ name: "A", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "testorg" });
      const res = await request(app).get(`/get/${evt._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe("A");
    });

    it("should return 404 for non-existing ID", async () => {
      const res = await request(app).get(`/get/${new mongoose.Types.ObjectId()}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("PUT /update/:id", () => {
    it("should update an existing event", async () => {
      const evt = await Event.create({ name: "B", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "testorg" });
      const res = await request(app).put(`/update/${evt._id}`).send({ name: "Updated Event" });
      expect(res.statusCode).toBe(200);
      expect(res.body.event.name).toBe("Updated Event");
    });

    it("should return 404 for invalid update", async () => {
      const res = await request(app).put(`/update/${new mongoose.Types.ObjectId()}`).send({ name: "Fail" });
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /delete/:id", () => {
    it("should delete event and bookings", async () => {
      const evt = await Event.create({ name: "DeleteMe", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "testorg" });
      await Booking.create({ username: "user1", eventId: evt._id.toString(), ticketsPurchased: 2, totalPayment: 100 });
      const res = await request(app).delete(`/delete/${evt._id}`);
      expect(res.statusCode).toBe(200);
    });

    it("should return 404 for missing event", async () => {
      const res = await request(app).delete(`/delete/${new mongoose.Types.ObjectId()}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /delete-by-organizer/:username", () => {
    it("should delete all events and bookings by organizer", async () => {
      const evt = await Event.create({ name: "OrgEvent", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "deleteorg" });
      await Booking.create({ username: "user1", eventId: evt._id.toString(), ticketsPurchased: 2, totalPayment: 100 });
      const res = await request(app).delete(`/delete-by-organizer/deleteorg`);
      expect(res.statusCode).toBe(200);
    });

    it("should return 404 if no events found", async () => {
      const res = await request(app).delete(`/delete-by-organizer/nobody`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /get-by-organizer/:username", () => {
    it("should get events for organizer", async () => {
      await Event.create({ name: "MyEvent", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "orguser" });
      const res = await request(app).get(`/get-by-organizer/orguser`);
      expect(res.statusCode).toBe(200);
    });

    it("should return 404 if no events", async () => {
      const res = await request(app).get(`/get-by-organizer/none`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe("GET /get-by-attendee/:username", () => {
    it("should get events with booking info", async () => {
      const evt = await Event.create({ name: "AttEvent", venue: "V", date: new Date(Date.now() + 10000), numberOfTickets: 10, pricePerTicket: 5, eventOrg: "orguser" });
      axios.get.mockResolvedValueOnce({ data: [{ eventId: evt._id.toString(), ticketsPurchased: 2, totalPayment: 100, _id: "bk1" }] });

      const res = await request(app).get(`/get-by-attendee/attendee1`);
      expect(res.statusCode).toBe(200);
      expect(res.body[0].name).toBe("AttEvent");
    });

    it("should return 404 if no bookings", async () => {
      axios.get.mockResolvedValueOnce({ data: [] });
      const res = await request(app).get(`/get-by-attendee/nobookings`);
      expect(res.statusCode).toBe(404);
    });

    it("should handle axios errors", async () => {
      axios.get.mockRejectedValueOnce(new Error("Connection error"));
      const res = await request(app).get(`/get-by-attendee/failure`);
      expect(res.statusCode).toBe(500);
    });
  });
});
