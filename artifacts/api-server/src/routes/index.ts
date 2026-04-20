import { Router, type IRouter } from "express";
import healthRouter from "./health";
import rasidRouter from "./rasid";

const router: IRouter = Router();

router.use(healthRouter);
router.use(rasidRouter);

export default router;
