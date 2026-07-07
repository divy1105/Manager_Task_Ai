import { useEffect, useState } from "react";
import { extractTasks, getTasks } from "./api";
import NotesInput from "./components/NotesInput.jsx";
import Filters from "./components/Filters.jsx";
import TaskList from "./components/TaskList.jsx";
import ExportButton from "./components/ExportButton.jsx";

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({ owner: "", status: "", priority: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadTasks() {
    try {
      setError("");
      const data = await getTasks(filters);
      setTasks(data);
    } catch (e) {
      setError(e.message);
    }
  }

  // Reload whenever filters change.
  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function handleExtract(notes) {
    setLoading(true);
    setError("");
    try {
      await extractTasks(notes);
      await loadTasks();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // Unique owners for the filter dropdown.
  const owners = [...new Set(tasks.map((t) => t.owner))].filter(Boolean);

  return (
    <div className="app">
      <header>
        <h1>🗂️ AI Project Manager Assistant</h1>
        <p className="subtitle">
          Paste meeting notes below — AI turns them into structured tasks.
        </p>
      </header>

      <NotesInput onExtract={handleExtract} loading={loading} />

      {error && <div className="error">⚠️ {error}</div>}

      <div className="toolbar">
        <Filters filters={filters} setFilters={setFilters} owners={owners} />
        <ExportButton />
      </div>

      <TaskList tasks={tasks} onChanged={loadTasks} />
    </div>
  );
}
