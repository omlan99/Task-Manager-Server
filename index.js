const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_admin}:${process.env.DB_pass}@cluster0.e6udf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
await client.connect();

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
    const taskCollection = client.db("taskManger").collection("taskList");

    // get api
    app.get("/tasks", async (req, res) => {});

    // post api
    app.post("/tasks", async (req, res) => {
      const task = req.body;
      const result = await taskCollection.insertOne(task);
    });

    // put api
    app.put("/tasks/:id", async (req, res) => {
      const { id } = req.params;
      const updatedTask = req.body;
      const result = await taskCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedTask }
      );
      res.send(result);
    });

    // delete api
    app.delete("/tasks/:id", async (req, res) => {
      const id = req.params.id;
      const result = await taskCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log("Port is running at", port);
});
