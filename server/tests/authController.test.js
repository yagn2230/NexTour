const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const { test } = require("node:test");
const User = require("../models/userSchme");
const { loginUser } = require("../controllers/authController");

test("login response includes organizer access state for protected frontend routes", async () => {
  const originalFindOne = User.findOne;
  const originalCompare = bcrypt.compare;
  const originalJwtSecret = process.env.JWT_SECRET;
  const user = {
    _id: { toString: () => "64b000000000000000000001" },
    fullName: "Verified Organizer",
    email: "organizer@example.com",
    password: "hashed-password",
    role: "User",
    isActive: true,
    organizerVerified: true,
    organizerVerificationStatus: "Approved",
    organizer: { isOrganizer: true, status: "Approved" },
  };

  try {
    delete process.env.JWT_SECRET;
    User.findOne = async () => user;
    bcrypt.compare = async () => true;

    const req = {
      body: { email: user.email, password: "correct-password" },
      session: {
        save(callback) {
          callback(null);
        },
      },
    };
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        this.body = body;
        return this;
      },
    };

    await loginUser(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.user.organizerVerified, true);
    assert.equal(res.body.user.organizerVerificationStatus, "Approved");
    assert.deepEqual(res.body.user.organizer, { isOrganizer: true, status: "Approved" });
    assert.equal(req.session.user.organizer.status, "Approved");
  } finally {
    User.findOne = originalFindOne;
    bcrypt.compare = originalCompare;
    if (originalJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalJwtSecret;
  }
});
