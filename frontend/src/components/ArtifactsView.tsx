import { useEffect, useState } from 'react';
import { getArtifacts, downloadArtifact, formatFileSize } from '../api/artifacts';
import type { Artifact } from '../types';

export default function ArtifactsView({ questionnaireId }: { questionnaireId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getArtifacts(questionnaireId)
      .then((r) => setArtifacts(r.data))
      .catch(() => setError('Не удалось загрузить список файлов'))
      .finally(() => setLoading(false));
  }, [questionnaireId]);

  // Эндпоинт скачивания требует JWT, поэтому файл тянем через axios
  // и отдаём браузеру через временный object URL.
  const handleDownload = async (artifact: Artifact) => {
    setDownloadingId(artifact.id);
    setError('');
    try {
      const { data } = await downloadArtifact(artifact.id);
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = artifact.fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError(`Не удалось скачать файл «${artifact.fileName}»`);
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;

  if (error && artifacts.length === 0) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (artifacts.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
        Файлы не прикреплены
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {error && <div className="px-6 py-3 text-sm text-red-600 bg-red-50">{error}</div>}
      <ul className="divide-y divide-gray-100">
        {artifacts.map((a) => (
          <li key={a.id} className="flex items-center gap-4 px-6 py-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800 truncate">{a.fileName}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                {formatFileSize(a.size)} ·{' '}
                {new Date(a.uploadedAt).toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
            <button
              onClick={() => void handleDownload(a)}
              disabled={downloadingId === a.id}
              className="shrink-0 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {downloadingId === a.id ? 'Скачивание...' : 'Скачать'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
