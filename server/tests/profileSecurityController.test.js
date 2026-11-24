const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { test } = require("node:test");
const User = require("../models/userSchme");
const {
  deleteNotification,
  changePassword,
} = require("../controllers/profileController");

const invoke = (handler, req) => new Promise((resolve, reject) => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      resolve(this);
      return this;
    },
  };
  handler(req, response, reject);
});

test("notification deletion is scoped to the authenticated user", async () => {
  const originalUpdateOne = User.updateOne;
  const userId = new mongoose.Types.ObjectId();
  const notificationId = new mongoose.Types.ObjectId();
  let captured;
  try {
    User.updateOne = async (filter, update) => {
      captured = { filter, update };
      return { matchedCount: 1, modifiedCount: 1 };
    };
    const response = await invoke(deleteNotification, {
      authUser: { id: userId.toString() },
      params: { notificationId: notificationId.toString() },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(captured.filter._id, userId.toString());
    assert.deepEqual(captured.update.$pull.notifications, { _id: notificationId.toString() });
  } finally {
    User.updateOne = originalUpdateOne;
  }
});

test("password changes require the current password and save a new hash", async () => {
  const originalFindById = User.findById;
  const userId = new mongoose.Types.ObjectId();
  const storedPassword = await bcrypt.hash("current-password", 4);
  let saved = false;
  let user;
  try {
    user = {
      password: storedPassword,
      async save() { saved = true; },
    };
    User.findById = () => ({ select: async () => user });
    const invalid = await invoke(changePassword, {
      authUser: { id: userId.toString() },
      body: { currentPassword: "incorrect-password", newPassword: "new-password-123" },
    });
    assert.equal(invalid.statusCode, 400);
    assert.equal(saved, false);

    const response = await invoke(changePassword, {
      authUser: { id: userId.toString() },
      body: { currentPassword: "current-password", newPassword: "new-password-123" },
    });
    assert.equal(response.statusCode, 200);
    assert.equal(saved, true);
    assert.equal(await bcrypt.compare("new-password-123", user.password), true);
  } finally {
    User.findById = originalFindById;
  }
});
