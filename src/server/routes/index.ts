import { Router } from "express";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { publicRouter } from "./public.js";
import { studentRouter } from "./student.js";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/", publicRouter);
apiRouter.use("/", studentRouter);
