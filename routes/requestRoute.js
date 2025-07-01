const express = require("express");
const router = express.Router();
const requestController = require("../controllers/requestController");
const authMiddleware = require("../middleware/authMiddleware");

const makeUploader = require("../utils/s3Uploader");
const upload = makeUploader(() => "resumes");

// Route to create a new request (resume upload, positions, and email)
router.post(
  "/create",
  authMiddleware,
  upload.single("resume"),
  requestController.createRequest
);

// Route to update an existing request by email
router.put(
  "/update/:email",
  authMiddleware,
  upload.single("resume"),
  requestController.updateRequestByEmail
);

// Route to get a specific request by email
router.get("/getRequest/:email", requestController.getRequestByEmail);

// Optional: Route to get all requests
router.get("/getAll", requestController.getAllRequests);

// Route to delete a request by email
router.delete("/delete/:email", requestController.deleteRequestByEmail);

// Route to set offered status for a request by email
router.put("/setOffered/:email", requestController.setOffereByEmail);

//Route to get only not offered requests
router.get("/getNotOffered", requestController.getNotOfferedRequests);

module.exports = router;
