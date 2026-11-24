const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { test } = require("node:test");
const User = require("../models/userSchme");
const { removeWishlistItem } = require("../controllers/profileController");

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

test("wishlist removal works with a route trip ID and no DELETE request body", async () => {
  const originalUpdateOne = User.updateOne;
  const userId = new mongoose.Types.ObjectId();
  const tripId = new mongoose.Types.ObjectId();
  let capturedFilter;
  let capturedUpdate;

  try {
    User.updateOne = async (filter, update) => {
      capturedFilter = filter;
      capturedUpdate = update;
      return { matchedCount: 1 };
    };

    const response = await invoke(removeWishlistItem, {
      authUser: { id: userId.toString() },
      params: { tripId: tripId.toString() },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(capturedFilter, { _id: userId.toString() });
    assert.deepEqual(capturedUpdate, { $pull: { wishlist: tripId.toString() } });
  } finally {
    User.updateOne = originalUpdateOne;
  }
});
