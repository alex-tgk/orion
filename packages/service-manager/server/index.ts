import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import pm2 from 'pm2';
import { promisify } from 'util';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const pm2Connect = promisify(pm2.connect.bind(pm2));
const pm2List = promisify(pm2.list.bind(pm2));
const pm2Start = promisify(pm2.start.bind(pm2));
const pm2Stop = promisify(pm2.stop.bind(pm2));
const pm2Restart = promisify(pm2.restart.bind(pm2));
const pm2Delete = promisify(pm2.delete.bind(pm2));

// PM2 Routes
app.get('/api/services', async (req, res) => {
  try {
    await pm2Connect();
    const list = await pm2List();
    
    const services = list.map((proc: any) => ({
      name: proc.name,
      pid: proc.pid,
      status: proc.pm2_env.status,
      cpu: proc.monit.cpu,
      memory: proc.monit.memory,
      uptime: Date.now() - proc.pm2_env.pm_uptime,
      restarts: proc.pm2_env.restart_time,
      port: proc.pm2_env.PORT || 'N/A',
      instances: proc.pm2_env.instances || 1
    }));
    
    res.json({ services });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:name/start', async (req, res) => {
  try {
    await pm2Connect();
    await pm2Start(req.params.name);
    res.json({ success: true, message: 'Service started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:name/stop', async (req, res) => {
  try {
    await pm2Connect();
    await pm2Stop(req.params.name);
    res.json({ success: true, message: 'Service stopped' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/services/:name/restart', async (req, res) => {
  try {
    await pm2Connect();
    await pm2Restart(req.params.name);
    res.json({ success: true, message: 'Service restarted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/services/:name/logs', async (req, res) => {
  try {
    const logs = await new Promise((resolve, reject) => {
      pm2.describe(req.params.name, (err, processDescription) => {
        if (err) reject(err);
        else resolve(processDescription);
      });
    });
    res.json({ logs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Real-time updates via WebSocket
io.on('connection', (socket) => {
  console.log('Client connected');
  
  const interval = setInterval(async () => {
    try {
      await pm2Connect();
      const list = await pm2List();
      socket.emit('services-update', list);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  }, 2000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Client disconnected');
  });
});

const PORT = process.env.PORT || 3300;
httpServer.listen(PORT, () => {
  console.log('Service Manager API running on port ' + PORT);
  console.log('PM2 integration active');
});
