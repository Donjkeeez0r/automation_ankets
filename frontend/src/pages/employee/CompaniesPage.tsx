import { useEffect, useState, type FormEvent } from 'react';
import {
  getCompanies,
  createCompany,
  getCompanyQuestionnaires,
  deleteCompany,
} from '../../api/companies';
import { createQuestionnaire } from '../../api/questionnaire';
import { createLink } from '../../api/links';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import QuestionOverridesDialog from '../../components/QuestionOverridesDialog';
import { useAuth } from '../../context/AuthContext';
import type { Company, CompanyQuestionnaire, CompanyLink } from '../../types';

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

const EMPTY_FORM = { name: '', inn: '', contactName: '', contactEmails: [''] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isEmail = (value: string) => EMAIL_RE.test(value.trim());

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

interface CompanyCardProps {
  company: Company;
  isAuditor: boolean;
  onRequestDelete: (company: Company) => void;
}

function CompanyCard({ company, isAuditor, onRequestDelete }: CompanyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<CompanyQuestionnaire[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // id анкеты, для которой открыто окно настройки обязательности вопросов
  const [overridesFor, setOverridesFor] = useState<string | null>(null);

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
            {company.contactName} · {company.contactEmails.join(', ')}
            {company.inn ? ` · ИНН ${company.inn}` : ''}
          </div>
        </button>
        <div className="shrink-0 flex items-center gap-2">
          {isAuditor ? (
            <button
              onClick={() => onRequestDelete(company)}
              className="px-4 py-2 border border-red-200 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors"
            >
              Удалить
            </button>
          ) : (
            <button
              onClick={handleCreateQuestionnaire}
              disabled={busy}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {busy ? '...' : 'Создать анкету'}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mt-3 text-xs text-red-600">{error}</div>}

      {expanded && (
        <div className="mt-4 ml-5">
          {loading ? (
            <div className="text-xs text-gray-500">Загрузка анкет...</div>
          ) : questionnaires.length === 0 ? (
            <div className="text-xs text-gray-500">
              {isAuditor
                ? 'У компании пока нет анкет.'
                : 'У компании пока нет анкет. Нажмите «Создать анкету».'}
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
                    {!isAuditor && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setOverridesFor(q.id)}
                          disabled={busy}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                        >
                          Настроить обязательность вопросов
                        </button>
                        <button
                          onClick={() => handleCreateLink(q.id)}
                          disabled={busy}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                        >
                          Отправить ОЛ
                        </button>
                      </div>
                    )}
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

      {overridesFor && (
        <QuestionOverridesDialog
          open
          questionnaireId={overridesFor}
          onClose={() => setOverridesFor(null)}
        />
      )}
    </div>
  );
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const isAuditor = user?.role === 'AUDITOR';

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [toDelete, setToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getCompanies()
      .then((r) => setCompanies(r.data))
      .catch(() => setError('Не удалось загрузить компании'))
      .finally(() => setLoading(false));
  }, []);

  const setEmail = (index: number, value: string) =>
    setForm((p) => ({
      ...p,
      contactEmails: p.contactEmails.map((email, i) => (i === index ? value : email)),
    }));

  const addEmail = () =>
    setForm((p) => ({ ...p, contactEmails: [...p.contactEmails, ''] }));

  const removeEmail = (index: number) =>
    setForm((p) => ({
      ...p,
      contactEmails: p.contactEmails.filter((_, i) => i !== index),
    }));

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();

    const emails = form.contactEmails.map((email) => email.trim()).filter(Boolean);
    if (emails.length === 0) {
      setCreateError('Укажите хотя бы один контактный email');
      return;
    }
    if (!emails.every(isEmail)) {
      setCreateError('Проверьте формат email — один из адресов заполнен некорректно');
      return;
    }

    setCreating(true);
    setCreateError('');
    try {
      const { data } = await createCompany({
        name: form.name,
        inn: form.inn || undefined,
        contactName: form.contactName,
        contactEmails: emails,
      });
      setCompanies((prev) => [...prev, data]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setCreateError(errorMessage(err, 'Не удалось создать компанию'));
    } finally {
      setCreating(false);
    }
  };

  const closeDeleteDialog = () => {
    setToDelete(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteCompany(toDelete.id);
      setCompanies((prev) => prev.filter((c) => c.id !== toDelete.id));
      closeDeleteDialog();
    } catch (err) {
      setDeleteError(errorMessage(err, 'Не удалось удалить компанию'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Компании-подрядчики</h1>

      {!isAuditor && (
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
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-600">
              Контактные email
            </label>
            {form.contactEmails.map((email, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(i, e.target.value)}
                  placeholder="Контактный email"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {form.contactEmails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmail(i)}
                    aria-label="Удалить email"
                    title="Удалить email"
                    className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 border border-gray-200 rounded-lg hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addEmail}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              + добавить ещё email
            </button>
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
      )}

      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Компании ещё не добавлены
        </div>
      ) : (
        <div className="space-y-3">
          {companies.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              isAuditor={isAuditor}
              onRequestDelete={setToDelete}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить компанию?"
        description={
          <>
            <p>
              Компания «{toDelete?.name ?? ''}» будет удалена безвозвратно.
            </p>
            <p className="font-medium text-red-600">
              Вместе с ней каскадно удалятся все её анкеты и вся история: ответы,
              результаты скоринга и выданные одноразовые ссылки. Восстановить
              данные будет невозможно.
            </p>
          </>
        }
        confirmLabel="Удалить компанию"
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={closeDeleteDialog}
      />
    </div>
  );
}
