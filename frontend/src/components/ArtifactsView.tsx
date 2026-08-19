import { useEffect, useRef, useState } from 'react';
import {
  getArtifacts,
  downloadArtifact,
  uploadGuaranteeLetter,
  saveBlobAs,
  formatFileSize,
} from '../api/artifacts';
import type { Artifact } from '../types';

export default function ArtifactsView({ questionnaireId }: { questionnaireId: string }) {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const letterInputRef = useRef<HTMLInputElement>(null);

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
      saveBlobAs(data, artifact.fileName);
    } catch {
      setError(`Не удалось скачать файл «${artifact.fileName}»`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Гарантийное письмо загружает сотрудник ПАО / аудитор — подрядчик увидит
  // его отдельным блоком на странице заполнения анкеты.
  const handleUploadLetter = async (selected: FileList | null) => {
    const file = selected?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const { data } = await uploadGuaranteeLetter(questionnaireId, file);
      setArtifacts((prev) => [data, ...prev]);
    } catch {
      setUploadError('Не удалось загрузить гарантийное письмо. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
      if (letterInputRef.current) letterInputRef.current.value = '';
    }
  };

  const uploadPanel = (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-800">Гарантийное письмо</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Файл станет доступен подрядчику для подписания по ссылке на анкету.
          </p>
        </div>
        <button
          type="button"
          onClick={() => letterInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? 'Загрузка...' : 'Прикрепить гарантийное письмо'}
        </button>
        <input
          ref={letterInputRef}
          type="file"
          className="hidden"
          onChange={(e) => void handleUploadLetter(e.target.files)}
        />
      </div>
      {uploadError && <div className="mt-3 text-sm text-red-600">{uploadError}</div>}
    </div>
  );

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;

  if (error && artifacts.length === 0) {
    return (
      <>
        {uploadPanel}
        <div className="text-sm text-red-600">{error}</div>
      </>
    );
  }

  return (
    <>
      {uploadPanel}
      {artifacts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
          Файлы не прикреплены
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {error && <div className="px-6 py-3 text-sm text-red-600 bg-red-50">{error}</div>}
          <ul className="divide-y divide-gray-100">
            {artifacts.map((a) => {
              const isLetter = a.type === 'guarantee_letter';
              return (
                <li
                  key={a.id}
                  className={`flex items-center gap-4 px-6 py-3 ${
                    isLetter ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <span className="shrink-0 text-lg" aria-hidden="true">
                    {isLetter ? '📄' : '📎'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-800 truncate">{a.fileName}</span>
                      {isLetter && (
                        <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                          Гарантийное письмо
                        </span>
                      )}
                    </div>
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
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
