const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/event-management_db", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define Booking Schema
const bookingSchema = new mongoose.Schema({
  username: String,
  eventId: String, // MongoDB ObjectId stored as a string
  ticketsPurchased: Number,
  totalPayment: Number,
});

const Booking = mongoose.model("Booking", bookingSchema);

// Create Booking API
app.post("/create", async (req, res) => {
  try {
    const { username, eventId, ticketsPurchased, totalPayment } = req.body;

    // Fetch event details
    const eventResponse = await axios.get(
      `http://localhost:3003/get/${eventId}`
    );
    const event = eventResponse.data;

    if (!event) return res.status(404).send({ message: "Event not found" });
    if (event.numberOfTickets < ticketsPurchased)
      return res.status(400).send({ message: "Not enough tickets available" });

    // Create booking
    const booking = new Booking({
      username,
      eventId,
      ticketsPurchased,
      totalPayment,
    });
    await booking.save();

    // Update event tickets count
    await axios.put(`http://localhost:3003/update/${eventId}`, {
      numberOfTickets: event.numberOfTickets - ticketsPurchased,
    });

    // ✅ Fetch user email and loyalty points synchronously using await
    let userEmail = "";
    let loyaltypoints = 0;
    let name = "";

    try {
      const userResponse = await axios.get(
        `http://localhost:3001/getbyusername/${username}`
      );
      const userData = userResponse.data;

      userEmail = userData.email;
      loyaltypoints = userData.loyaltyPoints;
      name = userData.name;
    } catch (error) {
      console.error("❌ Error fetching user data:", error.message);
      return res.status(500).send({ error: "Failed to fetch user data" });
    }

    // Send Email Confirmation
    if (userEmail) {
      await axios.post("http://localhost:3005/send", {
        useremail: userEmail,
        subject: "🎟 Booking Confirmation - Event Ticket",
        message: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #28a745;">Hello, ${name}!</h2>
            <p>Your booking for the event <b>${event.name}</b> at <b>${event.venue}</b> on <b>${event.date}</b> is confirmed.</p>
            <p><b>Tickets Purchased:</b> ${ticketsPurchased}</p>
            <p><b>Total Payment:</b> PKR ${totalPayment}</p>
            <p>Thank you for booking with us!</p>
            <p>Best regards,<br><b>EventSync Team</b></p>
          </div>
        `,
      });
    }

    console.log(
      `Existing Attendee Data: ${name} : ${userEmail} : ${loyaltypoints} : ${totalPayment}: ${
        (totalPayment * 10) / 100
      }`
    );
    console.log(`LOYALTY POINTS BEFORE: ${loyaltypoints}`);

    // ✅ Ensure totalPayment is a number before calculation
    const updatedPoints = loyaltypoints + Number(totalPayment) * 0.1;
    console.log(`New loyalty points: ${updatedPoints}`);

    // ✅ Update attendee with new points using axios (consistent with other requests)
    await axios.put(`http://localhost:3001/update/${username}`, {
      loyaltyPoints: updatedPoints,
    });

    res.status(200).send({
      message: "Booking created successfully. Confirmation email sent.",
      booking,
    });
  } catch (error) {
    console.error("❌ Error in /create:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Delete Booking API
app.delete("/delete/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).send({ message: "Booking not found" });

    // Fetch attendee details
    const attendeeResponse = await axios.get(
      `http://localhost:3001/getbyusername/${booking.username}`
    );
    const attendee = attendeeResponse.data;
    const userEmail = attendee?.email;
    const userName = attendee?.name || "Attendee";

    // Fetch event details to check if it still exists
    let eventExists = false;
    let updatedTickets = 0;
    try {
      const eventResponse = await axios.get(
        `http://localhost:3003/get/${booking.eventId}`
      );
      if (eventResponse.data) {
        eventExists = true;
        updatedTickets =
          eventResponse.data.numberOfTickets + booking.ticketsPurchased;
      }
    } catch (err) {
      console.error("Error fetching event details:", err.message);
      eventExists = false; // Event does not exist (was deleted)
    }

    // Restore event tickets if the event still exists
    if (eventExists) {
      await axios.put(`http://localhost:3003/update/${booking.eventId}`, {
        numberOfTickets: updatedTickets,
      });
    }

    // Delete booking
    await Booking.findByIdAndDelete(req.params.id);

    // Send Cancellation Email
    if (userEmail) {
      await axios.post("http://localhost:3005/send", {
        useremail: userEmail,
        subject: "🚫 Booking Cancelled - Event Ticket",
        message: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #dc3545;">Hello, ${userName}!</h2>
            <p>Your booking for the event has been successfully cancelled.</p>
            <p><b>Tickets Refunded:</b> ${booking.ticketsPurchased}</p>
            ${
              eventExists
                ? `<p>The tickets have been made available again for others to purchase.</p>`
                : `<p>Note: The event has been removed, so your tickets could not be restored.</p>`
            }
            <p>Your refund will be processed soon (if applicable).</p>
            <p>Best regards,<br><b>EventSync Team</b></p>
          </div>
        `,
      });
    }

    res.status(200).send({
      message: "Booking deleted successfully. Cancellation email sent.",
    });
  } catch (error) {
    console.error("Error in /delete:", error.message);
    res.status(500).send({ error: error.message });
  }
});

// Start server
app.listen(3004, () => console.log("Booking Service running on port 3004"));
