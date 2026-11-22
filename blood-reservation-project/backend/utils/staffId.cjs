const { randomInt } = require('node:crypto');

async function generateStaffId(Staff, createdAt = new Date()) {
  const year = String(createdAt.getFullYear()).slice(-2);
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const suffix = String(randomInt(0, 10000)).padStart(4, '0');
    const staffId = `SD${year}${suffix}`;
    if (!(await Staff.exists({ staffId }))) return staffId;
  }
  throw new Error('Could not generate a unique Staff ID. Please try again.');
}

module.exports = { generateStaffId };
