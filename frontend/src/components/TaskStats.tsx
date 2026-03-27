import React from 'react';

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

interface TaskStatsProps {
    tasks: Task[];
}

const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
    const total = tasks.length;
    const active = tasks.filter(t => !t.completed).length;
    const completed = tasks.filter(t => t.completed).length;
    const overdue = tasks.filter(t => {
        if (!t.dueDate || t.completed) return false;
        return new Date(t.dueDate) < new Date();
    }).length;

    if (total === 0) return null;

    return (
        <div className="task-stats">
            <span className="stat">
                <span className="stat-count">{total}</span> Total
            </span>
            <span className="stat stat-active">
                <span className="stat-count">{active}</span> Active
            </span>
            <span className="stat stat-completed">
                <span className="stat-count">{completed}</span> Done
            </span>
            {overdue > 0 && (
                <span className="stat stat-overdue">
                    <span className="stat-count">{overdue}</span> Overdue
                </span>
            )}
        </div>
    );
};

export default TaskStats;
