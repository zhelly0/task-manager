import React, { useState } from 'react';

type Priority = 'low' | 'medium' | 'high';

interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
}

interface TaskItemProps {
  task: Task;
  onDelete: (id: string) => void;
  onToggleCompletion: (id: string) => void;
  onEdit: (id: string, updates: Partial<Task>) => void;
}

const priorityLabels: Record<Priority, string> = {
  low: '🟢 Low',
  medium: '🟡 Medium',
  high: '🔴 High',
};

const TaskItem: React.FC<TaskItemProps> = ({ task, onDelete, onToggleCompletion, onEdit }) => {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDesc, setEditDesc] = useState(task.description);

  const isOverdue = task.dueDate && !task.completed && new Date(task.dueDate) < new Date();

  const handleSave = () => {
    if (!editTitle.trim()) return;
    onEdit(task.id, { title: editTitle, description: editDesc });
    setEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(task.title);
    setEditDesc(task.description);
    setEditing(false);
  };

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''} priority-${task.priority}`}>
      <div className="task-checkbox-container">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleCompletion(task.id)}
          className="task-checkbox"
          aria-label={`Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
        />
      </div>

      <div className="task-content">
        {editing ? (
          <div className="task-edit-form">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="form-input task-edit-input"
              autoFocus
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              className="form-textarea task-edit-textarea"
              rows={2}
            />
            <div className="task-edit-actions">
              <button type="button" className="btn btn-save btn-small" onClick={handleSave}>Save</button>
              <button type="button" className="btn btn-cancel btn-small" onClick={handleCancel}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="task-meta">
              <span className={`priority-badge priority-${task.priority}`}>
                {priorityLabels[task.priority]}
              </span>
              {task.dueDate && (
                <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
                  📅 {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <h3 className="task-title">{task.title}</h3>
            {task.description && <p className="task-description">{task.description}</p>}
          </>
        )}
      </div>

      <div className="task-actions">
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="btn btn-edit btn-small"
            aria-label={`Edit "${task.title}"`}
          >
            ✏️ Edit
          </button>
        )}
        <button
          onClick={() => onDelete(task.id)}
          className="btn btn-danger btn-small"
          aria-label={`Delete "${task.title}"`}
        >
          🗑️ Delete
        </button>
      </div>
    </div>
  );
};

export default TaskItem;
