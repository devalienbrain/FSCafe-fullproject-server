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

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    console.log("Pinged.. Successfully connected to MongoDB!");

    // JWT related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      // console.log(req.headers);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // middleware to verify token
    const verifyToken = (req, res, next) => {
      // console.log("Inside verifyToken:", req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "forbidden access" });
      } else {
        const token = req.headers.authorization.split(" ")[1];
        console.log("Token:", token);
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: "forbidden access" });
          }
          req.decoded = decoded;
          next();
        });
      }
    };

    // middleware to verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const userCollection = client.db("FSCafeDB").collection("users");

    // User related api
    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers.authorization);
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Call api from useAdmin client side
    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
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
    // handle make a user admin api
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedRole = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedRole);
      res.send(result);
    });

    // Cart items related api
    const cartCollection = client.db("FSCafeDB").collection("cart");

    app.get("/cart", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post("/cart", async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
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
