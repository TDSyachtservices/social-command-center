import { Router } from "express";

const router = Router();

// Returns mock engagement heatmap data for the dev environment.
// In production this is computed from real SocialComment timestamps.
function makeMockHeatmap() {
  const peaks: Record<number, number> = {
    9: 3, 12: 4, 17: 5, 18: 5, 19: 4, 20: 3,
  };
  const dayWeights = [0.6, 1, 1.1, 1.2, 1.1, 0.9, 0.7]; // Sun-Sat
  const heatmap: { day: number; hour: number; count: number }[] = [];
  let total = 0;
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const base = peaks[hour] ?? (hour >= 7 && hour <= 22 ? 1 : 0);
      const count = Math.round(base * dayWeights[day] * (0.8 + Math.random() * 0.4));
      if (count > 0) heatmap.push({ day, hour, count });
      total += count;
    }
  }
  return { heatmap, totalComments: total };
}

router.get("/insights/best-time", (_req, res) => {
  res.json({
    success: true,
    data: {
      FACEBOOK: makeMockHeatmap(),
      INSTAGRAM: {
        ...makeMockHeatmap(),
        heatmap: makeMockHeatmap().heatmap.map((c) => ({
          ...c,
          count: Math.round(c.count * (c.hour >= 11 && c.hour <= 14 ? 1.5 : 1)),
        })),
      },
      LINKEDIN: {
        ...makeMockHeatmap(),
        heatmap: makeMockHeatmap().heatmap.map((c) => ({
          ...c,
          count: Math.round(c.count * (c.day >= 1 && c.day <= 5 && c.hour >= 8 && c.hour <= 17 ? 1.8 : 0.3)),
        })),
      },
    },
  });
});

export default router;
