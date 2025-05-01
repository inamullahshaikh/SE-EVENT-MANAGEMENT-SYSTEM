const app = require("./app"); // Make sure app.js exports the Express app

const PORT = process.env.PORT || 3007;

app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
