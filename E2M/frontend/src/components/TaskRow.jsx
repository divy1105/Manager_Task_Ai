import { useState } from "react";
import { deleteTask, updateTask } from "../api";

const PRIORITIES = ["Low", "Medium", "High"];
const STATUSES = ["To Do", "In Progress", "Done"];

function isOverdue(dueDate, status) {
  if (!dueDate || status === "Done") return false;
  return dueDate < new Date().toISOString().slice(0, 10);
}

export default function TaskRow({ task, onChanged }) {
  const [draft, setDraft] = useState(task);
  const [saving, setSaving] = useState(false);

  // Persist a single field on change.
  async function save(field, value) {
    setDraft((d) => ({ ...d, [field]: value }));
    setSaving(true);
    try {
      await updateTask(task.id, { [field]: value });
      onChanged();
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this task?")) return;
    await deleteTask(task.id);
    onChanged();
  }

  return (
    <tr className={saving ? "saving" : ""}>
      <td>
        <input
          className="cell-input"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          onBlur={(e) => save("description", e.target.value)}
        />
      </td>
      <td>
        <input
          className="cell-input owner"
          value={draft.owner}
          onChange={(e) => setDraft({ ...draft, owner: e.target.value })}
          onBlur={(e) => save("owner", e.target.value)}
        />
      </td>
      <td>
        <input
          type="date"
          className="cell-input"
          value={draft.due_date || ""}
          onChange={(e) => save("due_date", e.target.value || null)}
        />
        {isOverdue(draft.due_date, draft.status) && <span className="overdue">overdue</span>}
      </td>
      <td>
        <select
          className={`badge priority-${draft.priority}`}
          value={draft.priority}
          onChange={(e) => save("priority", e.target.value)}
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </td>
      <td>
        <select
          className={`badge status-${draft.status.replace(/\s/g, "")}`}
          value={draft.status}
          onChange={(e) => save("status", e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </td>
      <td>
        <button className="delete" onClick={remove} title="Delete">✕</button>
      </td>
    </tr>
  );
}
