import { exportCsvUrl } from "../api";

export default function ExportButton() {
  return (
    <a className="secondary" href={exportCsvUrl()} download="tasks.csv">
      ⬇️ Export CSV
    </a>
  );
}
