const assert = require("node:assert/strict");
const { test } = require("node:test");
const { validateUploadedContent } = require("../middleware/uploadMiddleware");

const validateBuffer = async (mimetype, buffer) => {
  const result = { statusCode: null, body: null, nextCalled: false };
  const req = { file: { mimetype, buffer } };
  const res = {
    status(statusCode) {
      result.statusCode = statusCode;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    },
  };
  await validateUploadedContent(req, res, () => {
    result.nextCalled = true;
  });
  return result;
};

test("validates profile image signatures from memory uploads", async () => {
  const result = await validateBuffer(
    "image/jpeg",
    Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
  );
  assert.equal(result.nextCalled, true);
  assert.equal(result.statusCode, null);
});

test("rejects memory uploads whose content does not match the declared image type", async () => {
  const result = await validateBuffer("image/jpeg", Buffer.from("not an image"));
  assert.equal(result.nextCalled, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.message, "Uploaded file content does not match an allowed file type.");
});
