import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import Whiteboard from './components/Whiteboard';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<'tasks' | 'whiteboard'>('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use relative API routing so local dev (CRA proxy) and Azure SWA both work.
  const API_URL = '/api/tasks';

  // Fetch all tasks on component mount
  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(API_URL);
      setTasks(response.data);
    } catch (err) {
      setError('Failed to load tasks. Make sure the backend server is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (title: string, description: string) => {
    try {
      const response = await axios.post(API_URL, { title, description });
      setTasks([...tasks, response.data]);
    } catch (err) {
      setError('Failed to add task');
      console.error(err);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      setTasks(tasks.filter(task => task.id !== id));
    } catch (err) {
      setError('Failed to delete task');
      console.error(err);
    }
  };

  const toggleTaskCompletion = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    try {
      const response = await axios.put(`${API_URL}/${id}`, {
        completed: !task.completed
      });
      setTasks(tasks.map(t => t.id === id ? response.data : t));
    } catch (err) {
      setError('Failed to update task');
      console.error(err);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>📋 Task Manager + 🧠 Live Whiteboard</h1>
        <p>Stay organized and brainstorm together in real time</p>
      </header>

      <main className="app-main">
        <div className="view-switcher">
          <button
            type="button"
            className={`view-tab ${activeView === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveView('tasks')}
          >
            Tasks
          </button>
          <button
            type="button"
            className={`view-tab ${activeView === 'whiteboard' ? 'active' : ''}`}
            onClick={() => setActiveView('whiteboard')}
          >
            Live Whiteboard
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeView === 'tasks' ? (
          <>
            <TaskForm onAddTask={addTask} />
            {loading ? (
              <p className="loading">Loading tasks...</p>
            ) : (
              <TaskList
                tasks={tasks}
                onDeleteTask={deleteTask}
                onToggleCompletion={toggleTaskCompletion}
              />
            )}
          </>
        ) : (
          <Whiteboard />
        )}
      </main>
    </div>
  );
};

export default App;
