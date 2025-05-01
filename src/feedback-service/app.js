// Import required packages
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const axios = require("axios");
const cors = require("cors");
const crypto = require("crypto");
const app = express();
app.use(express.json());
app.use(cors());
// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Feedback Schema
const feedbackSchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    eventid: { type: String },
    bookingid: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
  },
  { timestamps: true }
);

const Feedback = mongoose.model("event-feedback", feedbackSchema);

// Create Feedback
app.post("/create-feedback", async (req, res) => {
  try {
    const { username, eventid, bookingid, rating, comment } = req.body;
    const feedback = new Feedback({
      username,
      eventid,
      bookingid,
      rating,
      comment,
    });
    await feedback.save();
    res.status(201).json({ message: "Feedback created", feedback });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete Feedback
app.delete("/delete-feedback/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Feedback.findByIdAndDelete(id);
    res.status(200).json({ message: "Feedback deleted" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get All Feedback
app.get("/get-feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find();
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get Feedback by Event ID
app.get("/get-feedback/:eventid", async (req, res) => {
  try {
    const { eventid } = req.params;
    const feedbacks = await Feedback.find({ eventid });
    res.status(200).json(feedbacks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
app.get("/get-event-by-booking/:bookingid", async (req, res) => {
  try {
    const { bookingid } = req.params;

    // Find feedback for the given booking ID
    const feedback = await Feedback.findOne({ bookingid });

    if (!feedback) {
      return res
        .status(404)
        .json({ message: "Feedback not found for this booking ID" });
    }
    res.status(200).json(feedback); // Return the event details
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
/*
// Start server
app.listen(3009, () => {
  console.log("Feedback service running on port 3009");
});
*/
module.exports = app;