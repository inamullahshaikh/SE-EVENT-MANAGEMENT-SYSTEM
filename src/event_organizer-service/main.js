const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Event Organizer Schema
const eventOrganizerSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  username: String,
  phone: String,
  status: { type: String, default: "PENDING" },
});

const EventOrganizer = mongoose.model(
  "EventOrganizer",
  eventOrganizerSchema,
  "eventorganizers"
);
app.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, phone } = req.body;
    console.log(`Received registration request for: ${username}`);

    // Check if the email or username exists in user-service
    const userCheck = await axios
      .get(`http://localhost:3000/getbyemail/${email}`)
      .catch(() => null);
    const usernameCheck = await axios
      .get(`http://localhost:3000/getbyusername/${username}`)
      .catch(() => null);

    if (userCheck?.data || usernameCheck?.data) {
      console.warn(`Registration failed: Username or email already exists`);
      return res
        .status(400)
        .send({ message: "Username or email already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create attendee
    const eventorganizer = new EventOrganizer({
      name,
      username,
      email,
      password: hashedPassword,
      phone,
    });

    await eventorganizer.save();
    console.log(`eventorganizer ${username} saved successfully!`);

    // Register user in user-service
    await axios.post("http://localhost:3000/register", {
      username,
      email,
      type: 1,
    });

    // Send Welcome Email
    await axios.post("http://localhost:3005/send", {
      useremail: email,
      subject: "📩 Application Received - Event Organizer Registration",
      message: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #007bff;">Hello, ${name}!</h2>
          <p>We have received your application for <b>Event Organizer</b> registration.</p>
          <p>Our team will review your application and get back to you soon.</p>
          <p>Meanwhile, you can explore our platform and learn more about EventSync.</p>
          <a href="http://localhost:5500" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visit Platform</a>
          <p>Best regards,<br><b>EventSync Team</b></p>
        </div>
      `,
    });

    console.log(`Welcome email sent to ${email}`);
    res
      .status(200)
      .send({ message: "Attendee registered, email sent", eventorganizer });
  } catch (error) {
    console.error(`Error in registration: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
});

// Get Event Organizer by Username
app.get("/getbyusername/:username", async (req, res) => {
  try {
    console.log(`🔍 Fetching organizer: ${req.params.username}`);
    const organizer = await EventOrganizer.findOne({
      username: req.params.username,
    });
    if (!organizer) {
      console.error("❌ Organizer not found:", req.params.username);
      return res.status(404).send({ message: "Organizer not found" });
    }
    res.status(200).send(organizer);
  } catch (error) {
    console.error("❌ Error fetching organizer:", error.message);
    res.status(500).send({ error: error.message });
  }
});
app.get("/getall", async (req, res) => {
  try {
    const organizer = await EventOrganizer.find();
    if (!organizer) {
      return res.status(404).send({ message: "Organizer not found" });
    }
    res.status(200).send(organizer);
  } catch (error) {
    console.error("❌ Error fetching organizer:", error.message);
    res.status(500).send({ error: error.message });
  }
});
// Login
app.post("/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log(`🔑 Login attempt: ${email}`);

    const organizer = await EventOrganizer.findOne(
      email ? { email } : { username }
    );
    if (!organizer) {
      console.error("❌ Organizer not found:", email);
      return res.status(404).send({ message: "Organizer not found" });
    }

    // 🔹 Check if the account is still pending
    if (organizer.status === "PENDING") {
      console.error("❌ Login blocked: Account approval pending");
      return res.status(403).send({ message: "Account approval pending" });
    }

    const isMatch = await bcrypt.compare(password, organizer.password);
    if (!isMatch) {
      console.error("❌ Invalid credentials for:", email);
      return res.status(400).send({ message: "Invalid credentials" });
    }

    console.log(`✅ Login successful: ${organizer.username}`);
    res.status(200).send({ username: organizer.username, type: 1 });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Update Event Organizer by Username
app.put("/update/:username", async (req, res) => {
  try {
    console.log(`🛠 Updating organizer: ${req.params.username}`);
    const { name, email, password, phone } = req.body;
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    const updateData = { name, email, phone };
    if (hashedPassword) updateData.password = hashedPassword;

    const organizer = await EventOrganizer.findOneAndUpdate(
      { username: req.params.username },
      updateData,
      { new: true }
    );
    if (!organizer) {
      console.error("❌ Organizer not found:", req.params.username);
      return res.status(404).send({ message: "Organizer not found" });
    }

    console.log(`✅ Organizer updated: ${req.params.username}`);
    res.status(200).send({ message: "Organizer updated", organizer });
  } catch (error) {
    console.error("❌ Update error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Delete Event Organizer by Username
app.delete("/delete/:username", async (req, res) => {
  try {
    console.log(`🗑 Deleting organizer: ${req.params.username}`);
    const organizer = await EventOrganizer.findOneAndDelete({
      username: req.params.username,
    });
    if (!organizer) {
      console.error("❌ Organizer not found:", req.params.username);
      return res.status(404).send({ message: "Organizer not found" });
    }

    console.log(`✅ Organizer deleted: ${req.params.username}`);
    res.status(200).send({
      message: "Organizer deleted successfully",
    });
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Change status to ACCEPTED
app.put("/accept/:username", async (req, res) => {
  try {
    console.log(`✔️ Accepting organizer: ${req.params.username}`);
    const organizer = await EventOrganizer.findOneAndUpdate(
      { username: req.params.username },
      { status: "ACCEPTED" },
      { new: true }
    );
    if (!organizer) {
      console.error("❌ Organizer not found:", req.params.username);
      return res.status(404).send({ message: "Organizer not found" });
    }

    console.log(`✅ Organizer accepted: ${req.params.username}`);
    res.status(200).send({
      message: "Organizer status updated to ACCEPTED.",
      organizer,
    });
    await axios.post("http://localhost:3005/send", {
      useremail: organizer.email,
      subject: "✅ Account Verified - EventSync",
      message: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #28a745;">Congratulations, ${organizer.name}!</h2>
          <p>Your application for <b>Event Organizer</b> has been <b>approved</b>.</p>
          <p>You can now start managing events on our platform.</p>
          <a href="http://localhost:5500" style="background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>
          <p>Best regards,<br><b>EventSync Team</b></p>
        </div>
      `,
    });
  } catch (error) {
    console.error("❌ Accept error:", error.message);
    res.status(500).send({ error: error.message });
  }
});
app.get("/get-attendee-details/:username", async (req, res) => {
  try {
    const username = req.params.username;

    // Step 1: Fetch attendee usernames from Booking Service
    const bookingResponse = await fetch(
      `http://localhost:3005/get-attendees-by-organizer/${username}`
    );
    if (!bookingResponse.ok)
      throw new Error("Failed to fetch from Booking Service");

    const attendeeUsernames = await bookingResponse.json();
    if (!attendeeUsernames.length)
      return res.status(404).json({ message: "No attendees found" });

    // Step 2: Fetch attendee details from Attendee Service
    const attendeeResponse = await fetch(
      `http://localhost:3004/getAttendeesByUsernames`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: attendeeUsernames }),
      }
    );

    if (!attendeeResponse.ok)
      throw new Error("Failed to fetch from Attendee Service");

    const attendees = await attendeeResponse.json();
    res.json(attendees);
  } catch (error) {
    console.error("Error fetching attendees:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/pending-requests", async (req, res) => {
  try {
    const pendingRequests = await EventOrganizer.find({ status: "PENDING" });
    res.json(pendingRequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.listen(3006, () =>
  console.log("🚀 Event Organizer service running on port 3006")
);
