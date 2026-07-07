import TaskRow from "./TaskRow.jsx";

export default function TaskList({ tasks, onChanged }) {
  if (!tasks.length) {
    return <p className="empty">No tasks yet. Paste some notes and click “Extract Tasks”.</p>;
  }

  return (
    <table className="tasks">
      <thead>
        <tr>
          <th>Task</th>
          <th>Owner</th>
          <th>Due date</th>
          <th>Priority</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onChanged={onChanged} />
        ))}
      </tbody>
    </table>
  );
}
