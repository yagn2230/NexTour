const assert = require("node:assert/strict");
const { test } = require("node:test");
const PlatformSettings = require("../models/PlatformSettings");
const Trip = require("../models/Trip");
const { updateAdminSettings } = require("../controllers/adminSettingsController");

const invoke = (body) => new Promise((resolve, reject) => {
  updateAdminSettings(
    { body, authUser: { id: "admin-id" } },
    {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(response) {
        resolve({ statusCode: this.statusCode || 200, body: response });
      },
    },
    reject
  );
});

test("category removal is blocked when trips use a removed category without support URL updates", async () => {
  const originalFindOne = PlatformSettings.findOne;
  const originalFindOneAndUpdate = PlatformSettings.findOneAndUpdate;
  const originalDistinct = Trip.distinct;
  const originalAggregate = Trip.aggregate;
  let settingsSaved = false;

  try {
    PlatformSettings.findOne = () => ({
      select() {
        return {
          lean: async () => ({ tripCategories: ["Culture", "Adventure"] }),
        };
      },
    });
    PlatformSettings.findOneAndUpdate = () => {
      settingsSaved = true;
      throw new Error("Settings must not be saved when a used category is removed.");
    };
    Trip.distinct = async () => ["Adventure"];
    Trip.aggregate = async () => [];

    const response = await invoke({ tripCategories: ["Culture"] });

    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /Adventure/);
    assert.equal(settingsSaved, false);
  } finally {
    PlatformSettings.findOne = originalFindOne;
    PlatformSettings.findOneAndUpdate = originalFindOneAndUpdate;
    Trip.distinct = originalDistinct;
    Trip.aggregate = originalAggregate;
  }
});
