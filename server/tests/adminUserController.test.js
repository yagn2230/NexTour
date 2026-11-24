const assert = require("node:assert/strict");
const { test } = require("node:test");
const User = require("../models/userSchme");
const { getAllUsers } = require("../controllers/adminUserController");

const invoke = (query) => new Promise((resolve, reject) => {
  getAllUsers(
    { query },
    {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(body) {
        resolve({ statusCode: this.statusCode || 200, body });
      },
    },
    reject
  );
});

test("admin user management supports organizer filtering with search and status", async () => {
  const originalFind = User.find;
  let capturedQuery;

  try {
    User.find = (query) => {
      capturedQuery = query;
      return {
        select() {
          return {
            sort: async () => [],
          };
        },
      };
    };

    const response = await invoke({ role: "Organizer", search: "alex", status: "active" });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(capturedQuery.$and[0].$or.map((condition) => Object.keys(condition)[0]), [
      "fullName",
      "email",
    ]);
    assert.deepEqual(capturedQuery.$and[1].$or, [
      { organizerVerified: true },
      { "organizer.isOrganizer": true, "organizer.status": "Approved" },
      { "organizer.status": "Approved" },
    ]);
    assert.equal(capturedQuery.isActive, true);
  } finally {
    User.find = originalFind;
  }
});

test("admin user management rejects unknown role filters", async () => {
  const originalFind = User.find;
  User.find = () => {
    throw new Error("User query should not run for an invalid role.");
  };

  try {
    const response = await invoke({ role: "Superuser" });
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
  } finally {
    User.find = originalFind;
  }
});
