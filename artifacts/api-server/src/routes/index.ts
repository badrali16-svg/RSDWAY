import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rasidRouter from "./rasid";
import sessionRouter from "./session";
import usersRouter from "./users";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(usersRouter);
router.use(requireAuth, rasidRouter);

export default router;
