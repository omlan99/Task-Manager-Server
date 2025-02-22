require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection URI
const uri = `mongodb+srv://${process.env.DB_admin}:${process.env.DB_pass}@cluster0.e6udf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient instance
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from any origin for development
  },
});

// Connect to MongoDB and set up API endpoints
async function run() {
  await client.connect();
  try {
    // Ping the DB to confirm connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");

    const taskCollection = client.db("taskManager").collection("taskList");
    const userCollection = client.db("taskManager").collection("users");
    // Socket.IO connection
    io.on("connection", (socket) => {
      
      // console.log("New client connected:", socket.id);
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
      });
    });

    app.get("/users/:email", async (req, res) => {
      
        const email = req.params.email;
        const user = await userCollection.findOne({ email });
        res.send(user);
    })
    app.post("/users", async (req, res) =>{
      const user = req.body
      const existingUser = await userCollection.findOne({ email: user.email });
      if (existingUser) {
        return res.status(200).send({ message: "User already exists", user: existingUser });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    // GET all tasks
    app.get("/tasks", async (req, res) => {
      try {
        const { email } = req.query; // Expecting ?email=user@example.com
        const query = email ? { email } : {};
        const tasks = await taskCollection.find(query).sort({ order: 1 }).toArray();
        res.json(tasks);
      } catch (error) {
        res.status(500).json({ error: "Failed to fetch tasks" });
      }
    });

    // POST a new task
    app.post("/tasks", async (req, res) => {
      try {
        const task = req.body;
        console.log(task)
        // Ensure timestamp is added
        task.timestamp = new Date().toISOString();
        const result = await taskCollection.insertOne(task);
        const insertedTask = await taskCollection.findOne({ _id: result.insertedId });
        // Broadcast the new task to all connected clients
        io.emit("taskAdded", insertedTask);
        res.json(insertedTask);
      } catch (error) {
        res.status(500).json({ error: "Failed to create task" });
      }
    });

    // PUT update a task
    app.put("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const updatedTask = req.body;
        await taskCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedTask }
        );
        const task = await taskCollection.findOne({ _id: new ObjectId(id) });
        // Broadcast the updated task to all clients
        io.emit("taskUpdated", task);
        res.json(task);
      } catch (error) {
        res.status(500).json({ error: "Failed to update task" });
      }
    });

    // DELETE a task
    app.delete("/tasks/:id", async (req, res) => {
      try {
        const { id } = req.params;
        // Optionally, fetch the task before deleting if you want to broadcast additional info
        const taskToDelete = await taskCollection.findOne({ _id: new ObjectId(id) });
        await taskCollection.deleteOne({ _id: new ObjectId(id) });
        // Broadcast deletion event with the task id
        io.emit("taskDeleted", id);
        res.json({ message: "Task deleted", deletedTask: taskToDelete });
      } catch (error) {
        res.status(500).json({ error: "Failed to delete task" });
      }
    });
  } finally {
    // Do not close the client in production
    // await client.close();
  }
}

run().catch(console.dir);

// Start the HTTP/Socket.IO server
server.listen(port, () => {
  console.log("Server is running on port", port);
});
