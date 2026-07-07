import { useState } from "react";

const SAMPLE = `Rahul will finish the login page by tomorrow. Priya needs to set up the database by Friday — this is high priority. Someone should also write the API docs.`;

export default function NotesInput({ onExtract, loading }) {
  const [notes, setNotes] = useState("");

  function submit() {
    if (notes.trim()) onExtract(notes);
  }

  return (
    <div className="card">
      <textarea
        className="notes"
        placeholder="Paste meeting notes or a task description here..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={6}
      />
      <div className="notes-actions">
        <button className="link" onClick={() => setNotes(SAMPLE)} type="button">
          Use sample
        </button>
        <button className="primary" onClick={submit} disabled={loading || !notes.trim()}>
          {loading ? "Extracting…" : "✨ Extract Tasks"}
        </button>
      </div>
    </div>
  );
}
