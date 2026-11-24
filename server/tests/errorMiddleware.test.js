const assert = require("node:assert/strict");
const { test } = require("node:test");
const { errorHandler } = require("../middleware/errorMiddleware");

const invokeErrorHandler = (error) => {
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
  errorHandler(error, {}, response, () => {});
  return response;
};

test("error handler preserves framework HTTP status codes in JSON responses", (context) => {
  const originalEnvironment = process.env.NODE_ENV;
  const originalConsoleError = console.error;
  process.env.NODE_ENV = "production";
  console.error = () => {};
  context.after(() => {
    if (originalEnvironment === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalEnvironment;
    console.error = originalConsoleError;
  });

  const response = invokeErrorHandler({ status: 403, message: "Forbidden" });
  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { success: false, message: "Forbidden" });
});
