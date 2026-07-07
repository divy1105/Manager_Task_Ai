const STATUSES = ["To Do", "In Progress", "Done"];
const PRIORITIES = ["Low", "Medium", "High"];

export default function Filters({ filters, setFilters, owners }) {
  function set(key, value) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="filters">
      <select value={filters.owner} onChange={(e) => set("owner", e.target.value)}>
        <option value="">All owners</option>
        {owners.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>

      <select value={filters.status} onChange={(e) => set("status", e.target.value)}>
        <option value="">All statuses</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
        <option value="">All priorities</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      {(filters.owner || filters.status || filters.priority) && (
        <button
          className="link"
          onClick={() => setFilters({ owner: "", status: "", priority: "" })}
        >
          Clear
        </button>
      )}
    </div>
  );
}
