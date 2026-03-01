const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

// middleware
//app.use(cors());
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://travel-ease-client-ten.vercel.app",
    ], // add Vercel URL add later
    credentials: true,
  }),
);

// MongoDB client
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();

    const db = client.db("travelEaseDB");
    const vehiclesCollection = db.collection("vehicles");
    const bookingsCollection = db.collection("bookings");

    app.get("/health", (req, res) => {
      res.status(200).json({ ok: true, message: "Travel Ease API is running" });
    });

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
    //-------------
    app.get("/api/vehicles/my", async (req, res) => {
      try {
        const { userEmail } = req.query;
        if (!userEmail)
          return res.status(400).send({ message: "userEmail required" });

        const result = await vehiclesCollection
          .find({ userEmail })
          .sort({ createdAt: -1 })
          .toArray();

        res.send(result);
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    //Get single vehicle by id
    app.get("/api/vehicles/:id", async (req, res) => {
      const { id } = req.params;
      const result = await vehiclesCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    //-----------------
    // POST add vehicle
    app.post("/api/vehicles", async (req, res) => {
      try {
        const vehicle = req.body;
        if (!vehicle?.vehicleName || !vehicle?.userEmail) {
          return res
            .status(400)
            .send({ message: "vehicleName & userEmail required" });
        }
        vehicle.createdAt = new Date();
        vehicle.availability = vehicle.availability || "Available";
        const result = await vehiclesCollection.insertOne(vehicle);
        res.send(result);
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    // PATCH update vehicle
    app.patch("/api/vehicles/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const update = req.body;

        delete update._id;
        delete update.createdAt; // prevent changing createdAt

        const result = await vehiclesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: update },
        );
        res.send(result);
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });

    //-------
    // DELETE vehicle
    app.delete("/api/vehicles/:id", async (req, res) => {
      try {
        const result = await vehiclesCollection.deleteOne({
          _id: new ObjectId(req.params.id),
        });
        res.send(result);
      } catch {
        res.status(500).send({ message: "Server error" });
      }
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

    //Create booking and store data in DB
    app.post("/api/bookings", async (req, res) => {
      try {
        const booking = req.body;

        // basic validation
        if (!booking?.vehicleId || !booking?.userEmail) {
          return res
            .status(400)
            .send({ message: "vehicleId and userEmail required" });
        }

        booking.createdAt = new Date();

        const result = await bookingsCollection.insertOne(booking);
        res.send(result);
      } catch (e) {
        res.status(500).send({ message: "Server error" });
      }
    });
    //---------------
    // GET my bookings
    app.get("/api/bookings", async (req, res) => {
      try {
        const { userEmail } = req.query;
        if (!userEmail) return res.send([]);
        const result = await bookingsCollection
          .find({ userEmail })
          .sort({ createdAt: -1 })
          .toArray();
        res.send(result);
      } catch {
        res.status(500).send({ message: "Server error" });
      }
    });
    // ----

    console.log("MongoDB connected & routes ready");
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
