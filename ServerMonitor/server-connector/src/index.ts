import express from 'express';
import os from 'os';
import dotenv from 'dotenv';
import { cpuUsage } from 'os-utils';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4120;

// Basic server info
const getServerInfo = () => {
  return new Promise<any>((resolve) => {
    cpuUsage((cpuPercent) => {
      const info = {
        hostname: os.hostname(),
        platform: os.platform(),
        uptime: os.uptime(),
        memory: {
          total: os.totalmem(),
          free: os.freemem(),
          usedPercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        cpu: {
          model: os.cpus()[0].model,
          cores: os.cpus().length,
          usagePercentage: (cpuPercent * 100).toFixed(2)
        },
        timestamp: new Date().toISOString()
      };
      resolve(info);
    });
  });
};

// Routes
app.get('/status', async (req, res) => {
  try {
    const serverInfo = await getServerInfo();
    res.json({ status: 'online', ...serverInfo });
  } catch (error) {
    console.error('Error fetching server status:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get server status' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server monitoring connector running on port ${PORT}`);
  console.log(`Access status endpoint at http://localhost:${PORT}/status`);
}); 