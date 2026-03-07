import express from "express";
import { compileLatex } from "../controllers/latexController.js";

const router = express.Router();

router.post("/compile", compileLatex);

export default router;