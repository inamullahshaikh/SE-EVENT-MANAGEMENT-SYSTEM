const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Event Schema
const eventSchema = new mongoose.Schema({
  name: String,
  venue: String,
  date: Date,
  numberOfTickets: Number,
  pricePerTicket: Number,
  eventOrg: String, // Username of the event organizer
});

const Event = mongoose.model("Event", eventSchema, "events");

// Create an event
app.post("/create", async (req, res) => {
  try {
    const { name, venue, date, numberOfTickets, pricePerTicket, eventOrg } =
      req.body;

    // Check if event organizer exists
    const eventOrganizer = await axios.get(
      `http://localhost:3006/getbyusername/${eventOrg}`
    );
    if (!eventOrganizer.data) {
      return res.status(404).send({ message: "Event organizer not found" });
    }

    // Check if the event date is in the future
    const eventDate = new Date(date);
    const currentDate = new Date();
    if (eventDate <= currentDate) {
      return res
        .status(400)
        .send({ message: "Event date must be in the future" });
    }

    const event = new Event({
      name,
      venue,
      date,
      numberOfTickets,
      pricePerTicket,
      eventOrg,
    });
    await event.save();
    res.status(200).send({ message: "Event created successfully", event });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get all events
app.get("/get", async (req, res) => {
  try {
    const events = await Event.find();
    res.status(200).send(events);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get event by ID
app.get("/get/:id", async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send({ message: "Event not found" });
    res.status(200).send(event);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Update event by ID
app.put("/update/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!event) return res.status(404).send({ message: "Event not found" });
    res.status(200).send({ message: "Event updated successfully", event });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Delete event by ID
app.delete("/delete/:id", async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).send({ message: "Event not found" });

    // Delete all bookings related to this event
    await Booking.deleteMany({ eventId: req.params.id });

    res
      .status(200)
      .send({ message: "Event and related bookings deleted successfully" });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Delete all events by event organizer username
app.delete("/delete-by-organizer/:username", async (req, res) => {
  try {
    const events = await Event.find({ eventOrg: req.params.username });

    if (!events.length)
      return res
        .status(404)
        .send({ message: "No events found for this organizer" });

    const eventIds = events.map((event) => event._id);

    // Delete all events by the organizer
    await Event.deleteMany({ eventOrg: req.params.username });

    // Delete all bookings for these events
    await Booking.deleteMany({ eventId: { $in: eventIds } });

    res.status(200).send({
      message: "All events and related bookings deleted successfully",
    });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Get events by event organizer
app.get("/get-by-organizer/:username", async (req, res) => {
  try {
    const events = await Event.find({ eventOrg: req.params.username });


    if (!events.length) {
      return res.status(404).send({ message: "No events found for this organizer" });
    }

    res.status(200).send(events);
  } catch (error) {
    console.error(`Error fetching events: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
});
app.listen(3003, () => console.log("Event service running on port 3003"));
