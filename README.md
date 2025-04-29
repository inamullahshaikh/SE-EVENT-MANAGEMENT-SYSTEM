

# **Event Management System Web Application**

## **REPORT (Doc Link)**
https://docs.google.com/document/d/1BF_ix8mH52zB6ckdrTVtjle4hJz2lizKYOYXFxRlWqw/edit?pli=1&tab=t.0

## **TIMELINE**

### 1. **Use Cases Implemented**

#### **Event Organizer Use Cases**
- As an Event Organizer, I want to create an event so that I can manage attendee registrations.
- As an Event Organizer, I want to register attendees so that they can participate in the event.
- As an Event Organizer, I want to manage events so that I can ensure smooth execution and attendee engagement.
- As an Event Organizer, I want to manage attendees so that I can track registrations and ensure event capacity is not exceeded.
- As an Event Organizer, I want to generate event analysis so that I can evaluate event success and plan future improvements.
- As an Event Organizer, I need to customize event details to enhance attendee experience.

#### **Attendee Use Cases**
- As an Attendee, I want to register for an event so that I can participate.
- As an Attendee, I want to receive a payment confirmation so that I can be assured my registration was successful.
- As an Attendee, I want to provide feedback so that I can share my experience and help improve future events.
- As a Frequent Attendee, I want to earn loyalty points so that I can redeem them for discounts or rewards.

#### **System Administrator Use Cases**
- As a System Administrator, I want to add or remove Event Organizers so that only authorized and active organizers can manage events effectively.
- As a System Administrator, I want to view and respond to user queries so that I can assist users and resolve their issues.
- As a System Administrator, I want to generate event analysis reports so that I can monitor overall platform performance and improve event management.

#### **General User Use Cases**
- As a User, I need to login and register to access my account.
- As a User, I want to receive email updates about events so that I stay informed about important changes.
- As a User, I want to submit queries to the admin so that I can get help with my issues or concerns.

---

### 2. **Architecture Selection**
We will use the **MERN (MongoDB, Express.js, React, Node.js) stack** for this project because:

- **MongoDB** – NoSQL database for flexible event and user data storage.
- **Express.js** – Backend framework to handle API requests.
- **React.js** – Frontend framework for a dynamic and responsive UI.
- **Node.js** – Handles backend logic and API endpoints efficiently.

#### **Other Tools & Libraries**
- **Redux** – State management in React.
- **JWT (JSON Web Tokens)** – Authentication.
- **Stripe/PayPal API** – Payment processing.
- **Nodemailer** – Email notifications.
- **Firebase Cloud Messaging** – Push notifications.
- **Socket.io** – Real-time updates (e.g., attendee count).

---

### 3. **Features & File Structure**

#### **Backend (Node.js + Express.js)**
```
📂 backend/
├── 📄 server.js            # Main entry point
├── 📂 config/              # Database & environment configurations
├── 📂 models/              # MongoDB schemas
│   ├── User.js            # Event Organizer, Admin, Attendee
│   ├── Event.js           # Event details, schedule, venue
│   ├── Ticket.js          # Payment, registration details
│   ├── Venue.js           # List of available venues
│   ├── Feedback.js        # User reviews & ratings
├── 📂 routes/              # API endpoints
│   ├── authRoutes.js      # Login, registration, JWT authentication
│   ├── eventRoutes.js     # Create, update, delete events
│   ├── userRoutes.js      # Profile management
│   ├── ticketRoutes.js    # Payment, ticket generation
├── 📂 middlewares/         # Authentication, validation
├── 📂 controllers/         # Business logic for different features
```

#### **Frontend (React.js + Redux)**
```
📂 frontend/
├── 📂 src/
│   ├── 📂 components/      # Reusable UI components
│   ├── 📂 pages/
│   │   ├── Login.js       # Login page
│   │   ├── Register.js    # Registration page
│   │   ├── Dashboard.js   # Organizer Panel
│   │   ├── EventDetail.js # View & register for events
│   │   ├── CreateEvent.js # Form to create an event
│   ├── 📂 redux/          # State management with actions & reducers
│   ├── 📂 utils/          # Helper functions, API calls
│   ├── App.js            # Routes & layout
│   ├── index.js          # Entry point
```

---

### 4. **Timeline (Scrum-based Development)**
#### **Project Duration: 12 Weeks (3 Sprints)**

#### 🟢 **Sprint 1 (Weeks 1-4): Authentication & Event Creation**
✅ User registration & login (JWT)  
✅ Event creation (CRUD operations)  
✅ Organizer dashboard  
✅ UI/UX design  

#### 🟡 **Sprint 2 (Weeks 5-8): Payments, Notifications & Attendee Management**
✅ Payment gateway integration  
✅ Attendee registration  
✅ Email & push notifications  
✅ Profile & ticket management  

#### 🔴 **Sprint 3 (Weeks 9-12): Advanced Features & Deployment**
✅ Admin panel for user management  
✅ Event analytics & reporting  
✅ Security & performance optimization  
✅ Deployment on AWS/Vercel  

---

## **📂 Project Structure**
Since your project follows a microservices approach, here's how it is structured:

```
📂 event-management-system/
├── 📂 attendee-service/            # Handles attendee registration and participation
├── 📂 booking-service/             # Manages event bookings and reservations
├── 📂 event-organizer-service/     # Handles event creation and management by organizers
├── 📂 event-service/               # Core service for handling event-related data
├── 📂 frontend/                    # React.js frontend application
├── 📂 notification-service/        # Sends email and push notifications
├── 📂 payment-service/             # Integrates with Stripe/PayPal for ticket payments
├── 📂 queries-service/             # Handles user queries and FAQs
├── 📂 user-service/                # Manages authentication and user profiles
├── 📄 package.json                 # Project dependencies and scripts
├── 📄 README.md                    # Project documentation
├── 📄 run.bat                      # Batch script to start services
└── 📂 node_modules/                # Installed Node.js dependencies
```

---

## **🚀 How to Run the Project**

### **Prerequisites**
Ensure you have the following installed:
- **Node.js (v16 or later)**
- **MongoDB** (Local or Atlas)
- **Docker** (for containerization, if used)
- **RabbitMQ** (for async communication, if used)

### **Run the Project**
#### **Clone the Repository**
```sh
git clone https://github.com/your-repo/event-management-system.git
cd event-management-system
```

#### **Run the Project using the Batch File**
```sh
run.bat
```
This will start all required services automatically.

---

