import { Router } from "express";
import multer from "multer";
import SubcriptionController from "../controllers/admin/subcription.controller.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const route = Router();

// Define subscription routes here
route.put(
  "/renovation",
  upload.single("voucher"),
  SubcriptionController.Renovation
);
route.put("/suspend", SubcriptionController.Suspend);

export default route;