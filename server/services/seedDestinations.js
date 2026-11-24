const Destination = require("../models/Destination");
const destinations = require("../data/destinationSeed");

const seedDestinations = async () => {
  const operations = destinations.map((destination) => ({
    updateOne: {
      filter: {
        country: destination.country,
        state: destination.state,
        city: destination.city,
      },
      update: { $set: destination },
      upsert: true,
    },
  }));

  await Destination.bulkWrite(operations);
};

module.exports = seedDestinations;
