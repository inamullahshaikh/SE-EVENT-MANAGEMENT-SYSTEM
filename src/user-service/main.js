const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  type: Number,
});

const User = mongoose.model("User", userSchema, "users");

// Register User
app.post("/register", async (req, res) => {
  try {
    const { username, email, type } = req.body;
    console.log(`🔹 Registering user: ${username} (${email})`);

    const user = new User({ username, email, type });
    await user.save();

    console.log(`✅ User registered: ${username}`);
    res.status(200).send({ message: "User registered", user });
  } catch (error) {
    console.error("❌ Registration error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Get User by Email
app.get("/getbyemail/:email", async (req, res) => {
  try {
    console.log(`🔍 Searching user by email: ${req.params.email}`);

    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      console.error("❌ User not found (email):", req.params.email);
      return res.status(404).send({ message: "User not found" });
    }

    console.log(`✅ User found (email): ${user.username}`);
    res.status(200).send(user);
  } catch (error) {
    console.error("❌ Error fetching user by email:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Get User by Username
app.get("/getbyusername/:username", async (req, res) => {
  try {
    console.log(`🔍 Searching user by username: ${req.params.username}`);

    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      console.error("❌ User not found (username):", req.params.username);
      return res.status(404).send({ message: "User not found" });
    }

    console.log(`✅ User found (username): ${user.username}`);
    res.status(200).send(user);
  } catch (error) {
    console.error("❌ Error fetching user by username:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Update User
app.put("/update/:id", async (req, res) => {
  try {
    console.log(`🛠 Updating user ID: ${req.params.id}`);

    const { username, email, type } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { username, email, type },
      { new: true }
    );

    if (!user) {
      console.error("❌ User not found (update):", req.params.id);
      return res.status(404).send({ message: "User not found" });
    }

    console.log(`✅ User updated: ${user.username}`);
    res.status(200).send({ message: "User updated", user });
  } catch (error) {
    console.error("❌ Update error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Delete User
app.delete("/delete/:username", async (req, res) => {
  try {
    console.log(`🗑 Deleting user: ${req.params.username}`);

    const user = await User.findOneAndDelete({ username: req.params.username });
    if (!user) {
      console.error("❌ User not found (delete):", req.params.username);
      return res.status(404).send({ message: "User not found" });
    }

    console.log(`✅ User deleted: ${req.params.username}`);
    res.status(200).send({ message: "User deleted" });
  } catch (error) {
    console.error("❌ Delete error:", error.message);
    res.status(500).send({ error: error.message });
  }
});

app.listen(3000, () => console.log("🚀 User service running on port 3000"));
