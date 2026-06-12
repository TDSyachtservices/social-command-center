import "dotenv/config";
import { connectDb, disconnectDb } from "./db/prisma.js";
import { logger } from "./utils/logger.js";
import app from "./app.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main(): Promise<void> {
  await connectDb();

  const server = app.listen(PORT, () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV }, "Server started");
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
  };

  process.once("SIGTERM", (sig) => shutdown(sig));
  process.once("SIGINT", (sig) => shutdown(sig));
}

main().catch((err) => {
  logger.error(err, "Startup error");
  process.exit(1);
});
