const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
const port = process.env.port || 5000;
require("dotenv").config();

// Middleware
app.use(express.json());
app.use(cors());

// Mongodb code
console.log(process.env.DB_USER, process.env.DB_SECRET);

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_SECRET}@cluster0.m38robg.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const userCollection = client.db("FSCafeDB").collection("users");

    // User related api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const alreadyExistUser = await userCollection.findOne(query);
      if (alreadyExistUser) {
        return res.send({ message: "User already Exists!", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from FS Cafe Server!");
});

app.listen(port, () => {
  console.log(`FS Cafe occupies the port of number: ${port}`);
});
