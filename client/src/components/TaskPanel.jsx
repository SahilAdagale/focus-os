import { useState, useEffect } from 'react'
import { getTasks, createTask, updateTask, deleteTask } from '../services/taskService'

function TaskPanel({ selectedTaskId, onSelectTask, disabled }) {
    const [tasks, setTasks] = useState([])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        const fetch = async () => {
            try {
                const data = await getTasks()
                setTasks(data.tasks)
            } catch (err) {
                console.error('Failed to load tasks:', err)
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [])

    const handleAdd = async () => {
        if (!input.trim()) return
        setAdding(true)
        try {
            const data = await createTask(input.trim())
            setTasks(prev => [data.task, ...prev])
            setInput('')
        } catch (err) {
            console.error('Failed to create task:', err)
        } finally {
            setAdding(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleAdd()
    }

    const handleToggle = async (task) => {
        const updated = { ...task, completed: !task.completed }
        setTasks(prev => prev.map(t => t._id === task._id ? updated : t)
            .sort((a, b) => a.completed - b.completed))
        try {
            await updateTask(task._id, { completed: !task.completed })
            // If the completed task was selected, deselect it
            if (!task.completed && selectedTaskId === task._id) {
                onSelectTask(null, null)
            }
        } catch (err) {
            // Revert on failure
            setTasks(prev => prev.map(t => t._id === task._id ? task : t))
        }
    }

    const handleDelete = async (taskId) => {
        setTasks(prev => prev.filter(t => t._id !== taskId))
        if (selectedTaskId === taskId) onSelectTask(null, null)
        try {
            await deleteTask(taskId)
        } catch (err) {
            console.error('Failed to delete task:', err)
        }
    }

    const handleSelect = (task) => {
        if (disabled) return
        if (task.completed) return
        if (selectedTaskId === task._id) {
            onSelectTask(null, null) // deselect
        } else {
            onSelectTask(task._id, task.title)
        }
    }

    const incompleteTasks = tasks.filter(t => !t.completed)
    const completedTasks = tasks.filter(t => t.completed)

    return (
        <div style={{
            width: '260px',
            flexShrink: 0,
            background: '#0d0d0d',
            border: '1px solid #1e1e1e',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignSelf: 'flex-start',
        }}>
            <div>
                <p style={{ fontSize: '13px', fontWeight: '500', marginBottom: '2px' }}>Tasks</p>
                <p style={{ fontSize: '11px', color: '#555' }}>
                    {selectedTaskId ? 'Click selected task to deselect' : 'Click a task to focus on it'}
                </p>
            </div>

            {/* Add task input */}
            <div style={{ display: 'flex', gap: '6px' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a task..."
                    maxLength={120}
                    style={{
                        flex: 1,
                        padding: '7px 10px',
                        background: '#1a1a1a',
                        border: '1px solid #2a2a2a',
                        borderRadius: '6px',
                        color: '#e8e8e8',
                        fontSize: '13px',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={handleAdd}
                    disabled={adding || !input.trim()}
                    style={{
                        padding: '7px 12px',
                        background: '#534AB7',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: adding || !input.trim() ? 'not-allowed' : 'pointer',
                        opacity: adding || !input.trim() ? 0.5 : 1,
                        transition: 'opacity 0.2s',
                    }}
                >
                    +
                </button>
            </div>

            {/* Task list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                {loading && <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', padding: '8px 0' }}>Loading...</p>}

                {!loading && tasks.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#444', textAlign: 'center', padding: '16px 0' }}>
                        No tasks yet. Add one above!
                    </p>
                )}

                {/* Incomplete tasks */}
                {incompleteTasks.map(task => {
                    const isSelected = selectedTaskId === task._id
                    return (
                        <div
                            key={task._id}
                            onClick={() => handleSelect(task)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 8px',
                                borderRadius: '7px',
                                border: `1px solid ${isSelected ? '#534AB7' : 'transparent'}`,
                                background: isSelected ? 'rgba(83,74,183,0.1)' : 'transparent',
                                cursor: disabled ? 'default' : 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {/* Checkbox */}
                            <div
                                onClick={e => { e.stopPropagation(); handleToggle(task) }}
                                style={{
                                    width: '15px', height: '15px',
                                    borderRadius: '4px',
                                    border: `1px solid ${isSelected ? '#534AB7' : '#333'}`,
                                    flexShrink: 0,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: 'transparent',
                                    transition: 'border-color 0.15s',
                                }}
                            />
                            {/* Title */}
                            <span style={{
                                fontSize: '13px',
                                color: isSelected ? '#a9a3f5' : '#ccc',
                                flex: 1,
                                lineHeight: '1.3',
                                wordBreak: 'break-word',
                            }}>
                                {task.title}
                            </span>
                            {/* Delete */}
                            <button
                                onClick={e => { e.stopPropagation(); handleDelete(task._id) }}
                                style={{
                                    background: 'none', border: 'none',
                                    color: '#444', fontSize: '12px',
                                    cursor: 'pointer', padding: '2px 4px',
                                    borderRadius: '4px', flexShrink: 0,
                                    transition: 'color 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                                onMouseLeave={e => e.currentTarget.style.color = '#444'}
                            >
                                ✕
                            </button>
                        </div>
                    )
                })}

                {/* Divider if there are completed tasks */}
                {completedTasks.length > 0 && incompleteTasks.length > 0 && (
                    <div style={{ borderTop: '1px solid #1a1a1a', margin: '4px 0' }} />
                )}

                {/* Completed tasks — strikethrough */}
                {completedTasks.map(task => (
                    <div
                        key={task._id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '6px 8px',
                            borderRadius: '7px',
                            opacity: 0.45,
                        }}
                    >
                        {/* Checked checkbox */}
                        <div
                            onClick={() => handleToggle(task)}
                            style={{
                                width: '15px', height: '15px',
                                borderRadius: '4px',
                                border: '1px solid #1D9E75',
                                background: 'rgba(29,158,117,0.2)',
                                flexShrink: 0,
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', color: '#1D9E75',
                            }}
                        >
                            ✓
                        </div>
                        <span style={{
                            fontSize: '12px', color: '#666',
                            flex: 1, textDecoration: 'line-through',
                            wordBreak: 'break-word',
                        }}>
                            {task.title}
                        </span>
                        <button
                            onClick={() => handleDelete(task._id)}
                            style={{
                                background: 'none', border: 'none',
                                color: '#333', fontSize: '11px',
                                cursor: 'pointer', padding: '2px 4px',
                                flexShrink: 0,
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#E24B4A'}
                            onMouseLeave={e => e.currentTarget.style.color = '#333'}
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default TaskPanel
