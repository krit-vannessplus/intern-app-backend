require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const cors = require("cors");

const userRoutes = require("./routes/userRoute");
const skillTestRoutes = require("./routes/skillTestRoute");
const requestRoutes = require("./routes/requestRoute");
const offerRoutes = require("./routes/offerRoute");
const personalInfoRoutes = require("./routes/personalInfoRoute");
const positionRoutes = require("./routes/positionRoute");
const filterRoutes = require("./routes/filterRoute");
const resultRoutes = require("./routes/resultRoute");

const port = process.env.PORT || 5000;

const app = express();
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(
  "/skillTestResources",
  express.static(path.join(__dirname, "skillTestResources"))
);
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

app.use("/api/users", userRoutes);
app.use("/api/skillTests", skillTestRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/personalInfos", personalInfoRoutes);
app.use("/api/filters", filterRoutes);
app.use("/api/results", resultRoutes);

app.listen(port, () => console.log(`Server running on port ${port}`));
