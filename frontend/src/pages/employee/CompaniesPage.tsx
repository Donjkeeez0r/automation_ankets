import { useEffect, useState, type FormEvent } from 'react';
import {
  getCompanies,
  createCompany,
  getCompanyQuestionnaires,
} from '../../api/companies';
import { createQuestionnaire } from '../../api/questionnaire';
import { createLink } from '../../api/links';
import StatusBadge from '../../components/StatusBadge';
import type { Company, CompanyQuestionnaire, CompanyLink } from '../../types';

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

const EMPTY_FORM = { name: '', inn: '', contactName: '', contactEmail: '' };

const fillUrl = (token: string) => `${window.location.origin}/fill/${token}`;

const isLinkLive = (link: CompanyLink) =>
  link.isActive && new Date(link.expiresAt).getTime() > Date.now();

function LinkRow({ link }: { link: CompanyLink }) {
  const [copied, setCopied] = useState(false);
  const url = fillUrl(link.token);
  const live = isLinkLive(link);

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`shrink-0 text-[11px] font-medium px-1.5 py-0.5 rounded ${
          live ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {live ? 'активна' : 'неактивна'}
      </span>
      <code className="flex-1 px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-800 break-all">
        {url}
      </code>
      <button
        onClick={copy}
        className="px-2.5 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shrink-0"
      >
        {copied ? 'Скопировано ✓' : 'Копировать'}
      </button>
    </div>
  );
}

function CompanyCard({ company }: { company: Company }) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<CompanyQuestionnaire[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await getCompanyQuestionnaires(company.id);
      setQuestionnaires(data);
      setLoaded(true);
    } catch (err) {
      setError(errorMessage(err, 'Не удалось загрузить анкеты компании'));
    } finally {
      setLoading(false);
    }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) void load();
  };

  const handleCreateQuestionnaire = async () => {
    setBusy(true);
    setError('');
    try {
      await createQuestionnaire(company.id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось создать анкету'));
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLink = async (questionnaireId: string) => {
    setBusy(true);
    setError('');
    try {
      await createLink(questionnaireId);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сгенерировать ссылку'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between gap-4">
        <button onClick={toggle} className="min-w-0 text-left">
          <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <span
              className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
            >
              ▶
            </span>
            {company.name}
          </div>
          <div className="text-xs text-gray-500 mt-0.5 ml-5">
            {company.contactName} · {company.contactEmail}
            {company.inn ? ` · ИНН ${company.inn}` : ''}
          </div>
        </button>
        <button
          onClick={handleCreateQuestionnaire}
          disabled={busy}
          className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {busy ? '...' : 'Создать анкету'}
        </button>
      </div>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

      {expanded && (
        <div className="mt-4 ml-5">
          {loading ? (
            <div className="text-xs text-gray-500">Загрузка анкет...</div>
          ) : questionnaires.length === 0 ? (
            <div className="text-xs text-gray-500">
              У компании пока нет анкет. Нажмите «Создать анкету».
            </div>
          ) : (
            <div className="space-y-3">
              {questionnaires.map((q) => (
                <div key={q.id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={q.status} />
                      <span className="text-xs text-gray-400">
                        от {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCreateLink(q.id)}
                      disabled={busy}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      Отправить ОЛ
                    </button>
                  </div>

                  {q.links.length === 0 ? (
                    <div className="text-xs text-gray-400">
                      Ссылка ещё не сгенерирована.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {q.links.map((link) => (
                        <LinkRow key={link.id} link={link} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  useEffect(() => {
    getCompanies()
      .then((r) => setCompanies(r.data))
      .catch(() => setError('Не удалось загрузить компании'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const { data } = await createCompany({
        name: form.name,
        inn: form.inn || undefined,
        contactName: form.contactName,
        contactEmail: form.contactEmail,
      });
      setCompanies((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(errorMessage(err, 'Не удалось создать компанию'));
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Компании-подрядчики</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Добавить компанию</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Название компании"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={form.inn}
              onChange={(e) => setForm((p) => ({ ...p, inn: e.target.value }))}
              placeholder="ИНН (необязательно)"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              required
              value={form.contactName}
              onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
              placeholder="Контактное лицо"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              required
              value={form.contactEmail}
              onChange={(e) => setForm((p) => ({ ...p, contactEmail: e.target.value }))}
              placeholder="Контактный email"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {creating ? 'Добавление...' : 'Добавить компанию'}
            </button>
            {createError && <span className="text-sm text-red-600">{createError}</span>}
          </div>
        </form>
      </div>

      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Компании ещё не добавлены
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      )}
    </div>
  );
}
