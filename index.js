const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// MongoDB client
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("travelEaseDB");
    const vehiclesCollection = db.collection("vehicles");

    app.get("/", (req, res) => {
      res.send("TravelEase Server is Running");
    });

    // Get latest 6 vehicles
    app.get("/api/vehicles/latest", async (req, res) => {
      const result = await vehiclesCollection
        .find()
        .sort({ createdAt: -1 })
        .limit(6)
        .toArray();

      res.send(result);
    });

    // Get all vehicles with filter,sort
    app.get("/api/vehicles", async (req, res) => {
      try {
        const { category, location, sort, minPrice, maxPrice } = req.query;

        const query = {};

        // filter by category
        if (category) query.category = category;

        // filter by location
        if (location) query.location = { $regex: location, $options: "i" };

        // filter by price range
        if (minPrice || maxPrice) {
          query.pricePerDay = {};
          if (minPrice) query.pricePerDay.$gte = Number(minPrice);
          if (maxPrice) query.pricePerDay.$lte = Number(maxPrice);
        }

        // sort options
        const sortObj = {};
        if (sort === "newest") sortObj.createdAt = -1;
        else if (sort === "oldest") sortObj.createdAt = 1;
        else if (sort === "price_asc") sortObj.pricePerDay = 1;
        else if (sort === "price_desc") sortObj.pricePerDay = -1;
        else sortObj.createdAt = -1; // default

        const result = await vehiclesCollection
          .find(query)
          .sort(sortObj)
          .toArray();
        res.send(result);
      } catch (e) {
        res.status(500).send({ message: "Server error" });
      }
    });

    console.log("MongoDB connected & routes ready");
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
