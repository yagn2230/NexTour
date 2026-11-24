const express = require("express");
const {
  getCountries,
  getStates,
  getCities,
  getPlaces,
} = require("../controllers/destinationController");

const router = express.Router();

router.get("/countries", getCountries);
router.get("/states/:country", getStates);
router.get("/cities/:state", getCities);
router.get("/places", getPlaces);

module.exports = router;
