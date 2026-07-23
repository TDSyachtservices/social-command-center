import { Router, type IRouter } from "express";
import healthRouter from "./health";
import aiScoreRouter from "./ai-score";
import hashtagSetsRouter from "./hashtag-sets";
import mentionContactsRouter from "./mention-contacts";
import mentionGroupsRouter from "./mention-groups";
import templatesRouter from "./templates";
import bestTimeRouter from "./best-time";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/ai", aiScoreRouter);
router.use(hashtagSetsRouter);
router.use(mentionContactsRouter);
router.use(mentionGroupsRouter);
router.use(templatesRouter);
router.use(bestTimeRouter);

export default router;
