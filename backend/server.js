const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// ── Persistence helpers ──────────────────────────────────────────────
// On Azure App Service, __dirname is read-only (zip deploy).
// Use DATA_PATH env var or fall back to /home/data (Azure writable) or ./data (local).
const DATA_DIR = process.env.DATA_PATH
  || (process.env.WEBSITE_INSTANCE_ID ? '/home/data' : path.join(__dirname, 'data'));
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const WHITEBOARD_FILE = path.join(DATA_DIR, 'whiteboard.json');

// Ensure data directory exists
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  console.log(`Data directory: ${DATA_DIR}`);
} catch (err) {
  console.warn(`Could not create data directory at ${DATA_DIR}:`, err.message);
  console.warn('State persistence will be disabled for this session.');
}

function loadJSON(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Failed to load ${filePath}:`, err.message);
  }
  return fallback;
}

function saveJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to save ${filePath}:`, err.message);
  }
}

// Debounce writes so rapid changes don't hammer the disk
const saveTimers = {};
function debouncedSave(filePath, getData, delay = 500) {
  if (saveTimers[filePath]) clearTimeout(saveTimers[filePath]);
  saveTimers[filePath] = setTimeout(() => saveJSON(filePath, getData()), delay);
}

function saveTasks() {
  debouncedSave(TASKS_FILE, () => tasks);
}

function saveWhiteboard() {
  debouncedSave(WHITEBOARD_FILE, () => whiteboardStrokes);
}

// ── Load persisted state ─────────────────────────────────────────────
const defaultTasks = [
  { id: uuidv4(), title: 'Learn Express', description: 'Study Express.js fundamentals', completed: false, priority: 'medium', dueDate: null, createdAt: new Date().toISOString() },
  { id: uuidv4(), title: 'Build API', description: 'Create REST API endpoints', completed: false, priority: 'high', dueDate: null, createdAt: new Date().toISOString() }
];

let tasks = loadJSON(TASKS_FILE, defaultTasks);
let whiteboardStrokes = loadJSON(WHITEBOARD_FILE, []);

const io = new Server(server, {
  path: '/api/realtime',
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes

// GET all tasks (supports ?search= and ?priority= query params)
app.get('/api/tasks', (req, res) => {
  let result = tasks;

  if (req.query.search) {
    const search = req.query.search.toLowerCase();
    result = result.filter(t =>
      t.title.toLowerCase().includes(search) ||
      t.description.toLowerCase().includes(search)
    );
  }

  if (req.query.priority) {
    result = result.filter(t => t.priority === req.query.priority);
  }

  res.json(result);
});

// GET a single task by ID
app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.json(task);
});

// POST a new task
app.post('/api/tasks', (req, res) => {
  const { title, description, priority, dueDate } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const validPriorities = ['low', 'medium', 'high'];

  const newTask = {
    id: uuidv4(),
    title,
    description: description || '',
    completed: false,
    priority: validPriorities.includes(priority) ? priority : 'medium',
    dueDate: dueDate || null,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  saveTasks();
  res.status(201).json(newTask);
});

// PUT update a task (mark as completed or update details)
app.put('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.description !== undefined) task.description = req.body.description;
  if (req.body.completed !== undefined) task.completed = req.body.completed;
  if (req.body.priority !== undefined) {
    const validPriorities = ['low', 'medium', 'high'];
    if (validPriorities.includes(req.body.priority)) task.priority = req.body.priority;
  }
  if (req.body.dueDate !== undefined) task.dueDate = req.body.dueDate;

  saveTasks();
  res.json(task);
});

// DELETE a task
app.delete('/api/tasks/:id', (req, res) => {
  const index = tasks.findIndex(t => t.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const deletedTask = tasks.splice(index, 1);
  saveTasks();
  res.json(deletedTask[0]);
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

io.on('connection', (socket) => {
  socket.emit('whiteboard:init', whiteboardStrokes);

  socket.on('whiteboard:draw', (stroke) => {
    if (!stroke) return;

    whiteboardStrokes.push(stroke);

    if (whiteboardStrokes.length > 10000) {
      whiteboardStrokes = whiteboardStrokes.slice(-10000);
    }

    saveWhiteboard();
    socket.broadcast.emit('whiteboard:draw', stroke);
  });

  socket.on('whiteboard:clear', () => {
    whiteboardStrokes = [];
    saveWhiteboard();
    io.emit('whiteboard:clear');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Manager API running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Data directory: ${DATA_DIR}`);
});

// Flush pending saves on shutdown
function flushAndExit(signal) {
  console.log(`${signal} received – flushing data...`);
  Object.values(saveTimers).forEach(t => clearTimeout(t));
  saveJSON(TASKS_FILE, tasks);
  saveJSON(WHITEBOARD_FILE, whiteboardStrokes);
  process.exit(0);
}
process.on('SIGTERM', () => flushAndExit('SIGTERM'));
process.on('SIGINT', () => flushAndExit('SIGINT'));
