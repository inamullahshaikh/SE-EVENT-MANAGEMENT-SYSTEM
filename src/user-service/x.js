const bcrypt = require("bcrypt");

const hash = "$2b$10$oEAW/eIttKsmdiigbvYB/.BvvulIliufWeiwmXceVcUuDqbibWcDO";
const password = "pass"; // Replace with the actual password

bcrypt.compare(password, hash, (err, result) => {
  if (result) {
    console.log("✅ Password matches!");
  } else {
    console.log("❌ Invalid password!");
  }
});
