require("dotenv").config();

const mongoose = require("mongoose");
const Trip = require("../models/Trip");

const run = async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured before running this migration.");
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const memberCount = { $size: { $ifNull: ["$members", []] } };
  const result = await Trip.collection.updateMany({}, [
    {
      $set: {
        currentMembers: memberCount,
        status: {
          $cond: [
            { $in: ["$status", ["Open", "Full"]] },
            { $cond: [{ $gte: [memberCount, "$maxMembers"] }, "Full", "Open"] },
            "$status",
          ],
        },
      },
    },
  ]);
  console.log(`Updated member counts for ${result.modifiedCount} trips.`);
};

run()
  .catch((error) => {
    console.error("Trip member count migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
