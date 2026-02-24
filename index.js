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

    console.log("MongoDB connected & routes ready");
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
