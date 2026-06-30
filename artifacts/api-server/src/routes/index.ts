import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiScoreRouter from "./ai-score";
import hashtagSetsRouter from "./hashtag-sets";
import mentionContactsRouter from "./mention-contacts";
import mentionGroupsRouter from "./mention-groups";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiScoreRouter);
router.use(hashtagSetsRouter);
router.use(mentionContactsRouter);
router.use(mentionGroupsRouter);

export default router;
