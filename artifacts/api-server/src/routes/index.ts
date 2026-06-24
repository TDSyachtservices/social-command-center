import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiScoreRouter from "./ai-score";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiScoreRouter);

export default router;
