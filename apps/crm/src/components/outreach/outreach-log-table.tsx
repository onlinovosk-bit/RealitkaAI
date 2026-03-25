type Row = {
  id: string;
  leadName: string;
  senderEmail: string;
  content: string;
  aiGenerated: boolean;
  createdAt?: string;
};

export default function OutreachLogTable({
  rows,
}: {
  rows: Row[];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">História odoslaných správ</h2>
        <p className="text-sm text-gray-500">
          Log emailov odoslaných AI systémom klientom.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-5 py-3 font-medium">Lead</th>
              <th className="px-5 py-3 font-medium">Odosielateľ</th>
              <th className="px-5 py-3 font-medium">Obsah</th>
              <th className="px-5 py-3 font-medium">AI</th>
              <th className="px-5 py-3 font-medium">Čas</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="px-5 py-4 font-medium text-gray-900">{row.leadName}</td>
                <td className="px-5 py-4 text-gray-700">{row.senderEmail || "-"}</td>
                <td className="px-5 py-4 text-gray-700">
                  <div className="max-w-xl truncate">{row.content}</div>
                </td>
                <td className="px-5 py-4 text-gray-700">{row.aiGenerated ? "Áno" : "Nie"}</td>
                <td className="px-5 py-4 text-gray-700">
                  {row.createdAt ? new Date(row.createdAt).toLocaleString("sk-SK") : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="border-t border-gray-200 p-5 text-sm text-gray-500">
          Zatiaľ neboli odoslané žiadne AI emaily.
        </div>
      )}
    </div>
  );
}
