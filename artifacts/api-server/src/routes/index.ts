import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rasidRouter from "./rasid";
import sessionRouter from "./session";
import usersRouter from "./users";
import externalRouter from "./external";
import clientsRouter from "./clients";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(sessionRouter);
router.use(usersRouter);
router.use("/rasid", requireAuth);
router.use("/auth", requireAuth);
router.use(rasidRouter);
router.use(externalRouter);
router.use(clientsRouter);

export default router;
