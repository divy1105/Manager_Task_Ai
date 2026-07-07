// Small fetch helpers. All requests go through the Vite proxy (/api -> backend).
const BASE = "/api";

export async function extractTasks(notes) {
  const res = await fetch(`${BASE}/extract`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || "Extraction failed");
  return res.json();
}

export async function getTasks(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v) params.append(k, v);
  });
  const res = await fetch(`${BASE}/tasks?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to load tasks");
  return res.json();
}

export async function updateTask(id, changes) {
  const res = await fetch(`${BASE}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(changes),
  });
  if (!res.ok) throw new Error("Failed to update task");
  return res.json();
}

export async function deleteTask(id) {
  const res = await fetch(`${BASE}/tasks/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete task");
  return res.json();
}

export function exportCsvUrl() {
  return `${BASE}/tasks/export`;
}
