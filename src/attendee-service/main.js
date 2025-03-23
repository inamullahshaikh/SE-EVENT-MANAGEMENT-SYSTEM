const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const axios = require("axios");
const cors = require("cors");
const app = express();
app.use(express.json());
app.use(cors());
mongoose.connect("mongodb://127.0.0.1:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const attendeeSchema = new mongoose.Schema({
  name: String,
  username: String,
  email: String,
  password: String,
  phone: String,
  loyaltyPoints: { type: Number, default: 0 },
});

const Attendee = mongoose.model("Attendee", attendeeSchema);

// Register attendee and create user entry
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
    const attendee = new Attendee({
      name,
      username,
      email,
      password: hashedPassword,
      phone,
    });

console.log(`${username}, ${phone} saved successfully!`);
    await attendee.save();
    console.log(`Attendee ${username} saved successfully!`);

    // Register user in user-service
    await axios.post("http://localhost:3000/register", {
      username,
      email,
      type: 2,
    });

    // Send Welcome Email
    await axios.post("http://localhost:3005/send", {
      useremail: email,
      subject: "🎉 Welcome to Event Management!",
      message: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #007bff;">Welcome, ${name}! 🎊</h2>
          <p>Thank you for registering as an attendee on <b>EventSync</b>. We are excited to have you!</p>
          <p>Your account details:</p>
          <ul style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
            <li><b>Username:</b> ${username}</li>
            <li><b>Email:</b> ${email}</li>
          </ul>
          <p>Explore upcoming events and book your favorite ones today!</p>
          <a href="http://localhost:5500" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Explore Events</a>
          <p>Best regards,<br><b>EventSync Team</b></p>
        </div>
      `,
    });

    console.log(`Welcome email sent to ${email}`);
    res
      .status(200)
      .send({ message: "Attendee registered, email sent", attendee });
  } catch (error) {
    console.error(`Error in registration: ${error.message}`);
    res.status(500).send({ message: error.message });
  }
});

// Login using email or username
app.post("/login", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    console.log(`Login attempt for: ${username || email}`);

    const attendee = await Attendee.findOne(email ? { email } : { username });
    if (!attendee) {
      console.warn("Login failed: Attendee not found");
      return res.status(404).send({ message: "Attendee not found" });
    }

    const isMatch = await bcrypt.compare(password, attendee.password);
    if (!isMatch) {
      console.warn("Login failed: Invalid credentials");
      return res.status(401).send({ message: "Invalid credentials" });
    }

    console.log(`Login successful for ${username || email}`);
    res.status(200).send({ username: attendee.username, type: 2 });
  } catch (error) {
    console.error(`Error in login: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
});

// Update attendee by username and call update in user-service
app.put("/update/:username", async (req, res) => {
  try {
    const { name, email, password, phone, loyaltyPoints } = req.body;
    const { username } = req.params;

    console.log(`Update request received for: ${username}`);

    // Fetch the existing attendee by username
    const existingAttendee = await Attendee.findOne({ username });

    if (!existingAttendee) {
      console.warn(`Update failed: Attendee ${username} not found`);
      return res.status(404).send({ message: "Attendee not found" });
    }

    // Ensure email is unique
    if (email && email !== existingAttendee.email) {
      const emailCheck = await axios
        .get(`http://localhost:3000/getbyemail/${email}`)
        .catch(() => null);
      if (emailCheck?.data) {
        console.warn(`Update failed: Email ${email} already in use`);
        return res.status(400).send({ message: "Email already in use" });
      }
    }

    // Hash password if provided
    const hashedPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;

    // Prepare update data
    const updateData = { name, email, phone };
    if (hashedPassword) updateData.password = hashedPassword;
    if (loyaltyPoints !== undefined) updateData.loyaltyPoints = loyaltyPoints;

    // Update attendee by _id instead of username
    const updatedAttendee = await Attendee.findByIdAndUpdate(
      existingAttendee._id,
      updateData,
      { new: true }
    );

    console.log(`Attendee ${username} updated successfully`);
    const user = await axios.get(
      `http://localhost:3000/getbyusername/${username}`
    );
    console.log(user.data);
    await axios.put(`http://localhost:3000/update/${user.data._id}`, {
      username,
      email,
      type: 2,
    });
    res
      .status(200)
      .send({ message: "Attendee updated", attendee: updatedAttendee });
  } catch (error) {
    console.error(
      `Error in updating attendee ${req.params.username}: ${error.message}`
    );
    res.status(500).send({ error: error.message });
  }
});

// Delete attendee by username and remove from user-service
app.delete("/delete/:username", async (req, res) => {
  try {
    const username = req.params.username;
    console.log(`Delete request received for: ${username}`);

    const attendee = await Attendee.findOneAndDelete({ username });
    if (!attendee) {
      console.warn(`Delete failed: Attendee ${username} not found`);
      return res.status(404).send({ message: "Attendee not found" });
    }

    // Delete from user-service
    await axios.delete(`http://localhost:3000/delete/${username}`);
    console.log(`Attendee ${username} deleted successfully`);

    res.status(200).send({ message: "Attendee deleted" });
  } catch (error) {
    console.error(
      `Error in deleting attendee ${req.params.username}: ${error.message}`
    );
    res.status(500).send({ error: error.message });
  }
});
// Get attendee by username
app.get("/getbyusername/:username", async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`Fetching attendee by username: ${username}`);

    const attendee = await Attendee.findOne({ username });
    if (!attendee) {
      console.warn(`Attendee not found for username: ${username}`);
      return res.status(404).send({ message: "Attendee not found" });
    }
    console.log("ATTENDEE FOUND\n" + attendee);
    res.status(200).send(attendee);
  } catch (error) {
    console.error(`Error fetching attendee by username: ${error.message}`);
    res.status(500).send({ error: error.message });
  }

});


// Get attendee by email
app.get("/getbyemail/:email", async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`Fetching attendee by email: ${email}`);

    const attendee = await Attendee.findOne({ email });
    if (!attendee) {
      console.warn(`Attendee not found for email: ${email}`);
      return res.status(404).send({ message: "Attendee not found" });
    }

    res.status(200).send(attendee);
  } catch (error) {
    console.error(`Error fetching attendee by email: ${error.message}`);
    res.status(500).send({ error: error.message });
  }
});


app.listen(3001, () => console.log("✅ Attendee service running on port 3001"));
