const bcrypt = require("bcryptjs");

async function generateHash() {
    const password = "password123";

    const hashedPassword = await bcrypt.hash(password, 12);

    console.log("Hashed password:", hashedPassword);
}

generateHash();
