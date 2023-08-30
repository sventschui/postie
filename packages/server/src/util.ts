export const logWithTimestamp = (message: string) => {
  console.log(`[${new Date().toISOString()}] ${message}`);
};
