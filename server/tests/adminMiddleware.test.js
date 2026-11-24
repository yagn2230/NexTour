const assert = require("node:assert/strict");
const { test } = require("node:test");
const adminMiddleware = require("../middleware/adminMiddleware");

const invoke = (req) => {
  const response = {
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
  let nextCalled = false;
  adminMiddleware(req, response, () => { nextCalled = true; });
  return { response, nextCalled };
};

test("admin middleware accepts an authenticated admin bearer identity without a session", () => {
  const { response, nextCalled } = invoke({ authUser: { id: "admin-id", role: "Admin" } });
  assert.equal(response.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("admin middleware preserves session authorization and rejects non-admin users", () => {
  const admin = invoke({ session: { user: { id: "admin-id", role: "Admin" } } });
  assert.equal(admin.nextCalled, true);

  const user = invoke({ authUser: { id: "user-id", role: "User" } });
  assert.equal(user.response.statusCode, 403);
  assert.match(user.response.body.message, /admin rights required/i);

  const anonymous = invoke({});
  assert.equal(anonymous.response.statusCode, 401);
});
