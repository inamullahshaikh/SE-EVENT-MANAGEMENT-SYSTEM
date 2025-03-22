const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");

// Create an express app
const app = express();

// Enable CORS for cross-origin requests
app.use(cors());

// Middleware to parse JSON request bodies
app.use(bodyParser.json());

// MongoDB connection
mongoose.connect("mongodb://localhost:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Mongoose schema for queries
const querySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  question: { type: String, required: true },
  answer: { type: String, default: null },
});

const Query = mongoose.model("Query", querySchema);

// API for creating a question
app.post("/createquestion", async (req, res) => {
  const { name, email, question } = req.body;

  if (!name || !email || !question) {
    return res
      .status(400)
      .json({ error: "Name, email, and question are required" });
  }

  try {
    const newQuery = new Query({
      name,
      email,
      question,
    });

    await newQuery.save();
    res
      .status(201)
      .json({ message: "Question created successfully", query: newQuery });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to create question", details: error });
  }
});

// API for answering a question
app.post("/answerquestion", async (req, res) => {
  const { queryId, answer } = req.body;

  if (!queryId || !answer) {
    return res.status(400).json({ error: "Query ID and answer are required" });
  }

  try {
    const query = await Query.findById(queryId);

    if (!query) {
      return res.status(404).json({ error: "Query not found" });
    }

    query.answer = answer;
    await query.save();

    // Send email notification after answering
    await axios.post("http://localhost:3005/send", {
      useremail: query.email,
      subject: "🎉 Your Question and Answer on Event Management",
      message: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #007bff;">Hello, ${query.name}!</h2>
          <p><b>Question:</b> ${query.question}</p>
          <p><b>Answer:</b> ${answer}</p>
          <p>Visit our website for more details:</p>
          <a href="http://localhost:5500" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visit Website</a>
          <p>Regards,<br><b>Event Management Team</b></p>
        </div>
      `,
    });

    res.status(200).json({ message: "Answer added successfully", query });
  } catch (error) {
    res.status(500).json({
      error: "Failed to answer the question",
      details: error.toString(),
    });
  }
});

// API for getting all unanswered queries
app.get("/getallunansweredqueries", async (req, res) => {
  try {
    const query = await Query.find({ answer: null });
    res.status(200).send(query);
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// API for getting all queries
app.get("/getallqueries", async (req, res) => {
  try {
    const allQueries = await Query.find();
    res.status(200).json({ allQueries });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to retrieve queries", details: error });
  }
});

// Start the server
app.listen(3008, () => {
  console.log(`Queries service running on http://localhost:3008`);
});
