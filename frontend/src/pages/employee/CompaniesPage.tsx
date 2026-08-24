import { useEffect, useMemo, useState } from 'react';
import {
  getCompanies,
  createCompany,
  updateCompany,
  getCompanyQuestionnaires,
  deleteCompany,
  getCompanyEmployees,
  addCompanyEmployee,
  deleteCompanyEmployee,
  updateCompanyStatus,
} from '../../api/companies';
import { createQuestionnaire } from '../../api/questionnaire';
import { createLink } from '../../api/links';
import StatusBadge from '../../components/StatusBadge';
import ContractorStatusBadge, {
  CONTRACTOR_STATUS_CONFIG,
  CONTRACTOR_STATUS_ORDER,
} from '../../components/ContractorStatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import CompanyForm, { type CompanyFormPayload } from '../../components/CompanyForm';
import QuestionOverridesDialog from '../../components/QuestionOverridesDialog';
import SearchInput from '../../components/SearchInput';
import Pagination from '../../components/Pagination';
import { useAuth } from '../../context/AuthContext';
import { usePagination } from '../../lib/pagination';
import { matchesQuery } from '../../lib/search';
import type {
  Company,
  CompanyQuestionnaire,
  CompanyLink,
  ContractorEmployee,
  ContractorStatus,
} from '../../types';

type CompanySort = 'name' | 'createdAt';

const SORT_LABELS: Record<CompanySort, string> = {
  name: 'По названию (А-Я)',
  createdAt: 'Сначала новые',
};

function errorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
    ?.message;
  if (Array.isArray(msg)) return msg.join(', ');
  return msg ?? fallback;
}

const fillUrl = (token: string) => `${window.location.origin}/fill/${token}`;

// Срок на заполнение анкеты по умолчанию — совпадает с дефолтом бэкенда
const DEFAULT_FILL_DAYS = 30;
const MAX_FILL_DAYS = 365;

const isFillDaysValid = (value: string) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= MAX_FILL_DAYS;
};

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

// Сотрудники компании-подрядчика: из этого списка подрядчик выбирает себя
// на публичной FillPage. Монтируется только при раскрытой карточке компании.
function EmployeesSection({
  companyId,
  isAuditor,
}: {
  companyId: string;
  isAuditor: boolean;
}) {
  const [employees, setEmployees] = useState<ContractorEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [toDelete, setToDelete] = useState<ContractorEmployee | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getCompanyEmployees(companyId)
      .then((r) => setEmployees(r.data))
      .catch((err) => setError(errorMessage(err, 'Не удалось загрузить сотрудников')))
      .finally(() => setLoading(false));
  }, [companyId]);

  const closeForm = () => {
    setAdding(false);
    setName('');
    setPosition('');
    setEmail('');
    setFormError('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Укажите имя сотрудника');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const { data } = await addCompanyEmployee(companyId, {
        name: name.trim(),
        position: position.trim() || undefined,
        email: email.trim() || undefined,
      });
      setEmployees((prev) =>
        [...prev, data].sort((a, b) => a.name.localeCompare(b.name, 'ru')),
      );
      closeForm();
    } catch (err) {
      setFormError(errorMessage(err, 'Не удалось добавить сотрудника'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteCompanyEmployee(toDelete.id);
      setEmployees((prev) => prev.filter((e) => e.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      setDeleteError(errorMessage(err, 'Не удалось удалить сотрудника'));
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          Сотрудники
        </h3>
        {!isAuditor && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
          >
            Добавить сотрудника
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-xs text-gray-500">Загрузка сотрудников...</div>
      ) : error ? (
        <div className="text-xs text-red-600">{error}</div>
      ) : employees.length === 0 ? (
        <div className="text-xs text-gray-500">
          Сотрудники не добавлены. Пока список пуст, подрядчик заполняет анкету анонимно.
        </div>
      ) : (
        <ul className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
          {employees.map((e) => (
            <li key={e.id} className="flex items-center gap-3 px-3 py-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm text-gray-800 truncate">{e.name}</div>
                {(e.position || e.email) && (
                  <div className="text-xs text-gray-500 truncate">
                    {[e.position, e.email].filter(Boolean).join(' · ')}
                  </div>
                )}
              </div>
              {!isAuditor && (
                <button
                  onClick={() => setToDelete(e)}
                  className="shrink-0 text-xs text-red-600 hover:text-red-700"
                >
                  Удалить
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <form onSubmit={handleAdd} className="mt-3 space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Имя сотрудника *"
            className={inputClass}
          />
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="Должность (необязательно)"
            className={inputClass}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (необязательно)"
            className={inputClass}
          />
          {formError && <div className="text-xs text-red-600">{formError}</div>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Добавление...' : 'Добавить'}
            </button>
            <button
              type="button"
              onClick={closeForm}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить сотрудника?"
        description={
          <p>
            Сотрудник «{toDelete?.name ?? ''}» больше не будет отображаться в списке
            выбора при заполнении анкеты. Уже заполненные анкеты сохранятся, но
            останутся без указания заполнившего.
          </p>
        }
        confirmLabel="Удалить"
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => {
          setToDelete(null);
          setDeleteError('');
        }}
      />
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  isAuditor: boolean;
  onRequestDelete: (company: Company) => void;
  onUpdated: (company: Company) => void;
}

function CompanyCard({
  company,
  isAuditor,
  onRequestDelete,
  onUpdated,
}: CompanyCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionnaires, setQuestionnaires] = useState<CompanyQuestionnaire[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // id анкеты, для которой открыто окно настройки обязательности вопросов
  const [overridesFor, setOverridesFor] = useState<string | null>(null);
  // Анкета, для которой открыт попап выбора срока заполнения перед генерацией ОЛ
  const [linkFor, setLinkFor] = useState<string | null>(null);
  const [fillDays, setFillDays] = useState(String(DEFAULT_FILL_DAYS));
  const [editing, setEditing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState('');

  const handleStatusChange = async (status: ContractorStatus) => {
    if (status === company.status) return;
    setStatusSaving(true);
    setStatusError('');
    try {
      const { data } = await updateCompanyStatus(company.id, status);
      onUpdated(data);
    } catch (err) {
      setStatusError(errorMessage(err, 'Не удалось изменить статус'));
    } finally {
      setStatusSaving(false);
    }
  };

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

  const handleCreateLink = async (questionnaireId: string, fillDays: number) => {
    setBusy(true);
    setError('');
    try {
      await createLink(questionnaireId, fillDays);
      await load();
      return true;
    } catch (err) {
      setError(errorMessage(err, 'Не удалось сгенерировать ссылку'));
      return false;
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
            <>
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Редактировать
              </button>
              <button
                onClick={handleCreateQuestionnaire}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {busy ? '...' : 'Создать анкету'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Статус подрядчика: виден и в свёрнутой, и в развёрнутой карточке.
          Менять могут и EMPLOYEE, и AUDITOR. */}
      <div className="mt-3 ml-5 flex items-center gap-2 flex-wrap">
        <ContractorStatusBadge status={company.status} />
        <select
          value={company.status}
          disabled={statusSaving}
          onChange={(e) => void handleStatusChange(e.target.value as ContractorStatus)}
          aria-label={`Статус подрядчика «${company.name}»`}
          className="px-2 py-1 border border-gray-300 rounded-lg text-xs bg-white disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CONTRACTOR_STATUS_ORDER.map((s) => (
            <option key={s} value={s}>
              {CONTRACTOR_STATUS_CONFIG[s].label}
            </option>
          ))}
        </select>
        {statusSaving && <span className="text-xs text-gray-400">Сохранение...</span>}
        {statusError && <span className="text-xs text-red-600">{statusError}</span>}
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
                          onClick={() => {
                            setFillDays(String(DEFAULT_FILL_DAYS));
                            setLinkFor(q.id);
                          }}
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

          <EmployeesSection companyId={company.id} isAuditor={isAuditor} />
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEditing(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-xl bg-white rounded-xl border border-gray-200 shadow-xl p-5"
          >
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Редактировать компанию
            </h2>
            <CompanyForm
              company={company}
              submitLabel="Сохранить"
              busyLabel="Сохранение..."
              fallbackError="Не удалось сохранить компанию"
              onCancel={() => setEditing(false)}
              onSubmit={async (payload) => {
                const { data } = await updateCompany(company.id, payload);
                onUpdated(data);
                setEditing(false);
              }}
            />
          </div>
        </div>
      )}

      {linkFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => !busy && setLinkFor(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-sm bg-white rounded-xl border border-gray-200 shadow-xl p-5"
          >
            <h2 className="text-base font-semibold text-gray-900">
              Отправить ОЛ
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Ссылка будет отправлена на контактные адреса компании.
            </p>

            <label
              htmlFor="fill-days"
              className="block mt-4 text-xs font-medium text-gray-700"
            >
              Срок на заполнение (дней)
            </label>
            <input
              id="fill-days"
              type="number"
              min={1}
              max={MAX_FILL_DAYS}
              value={fillDays}
              autoFocus
              onChange={(e) => setFillDays(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isFillDaysValid(fillDays) && (
              <div className="mt-1 text-xs text-red-600">
                Укажите целое число от 1 до {MAX_FILL_DAYS}.
              </div>
            )}

            {error && <div className="mt-2 text-xs text-red-600">{error}</div>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setLinkFor(null)}
                disabled={busy}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={async () => {
                  if (await handleCreateLink(linkFor, Number(fillDays))) {
                    setLinkFor(null);
                  }
                }}
                disabled={busy || !isFillDaysValid(fillDays)}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {busy ? 'Отправка...' : 'Отправить'}
              </button>
            </div>
          </div>
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

  const [toDelete, setToDelete] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CompanySort>('name');

  useEffect(() => {
    getCompanies()
      .then((r) => setCompanies(r.data))
      .catch(() => setError('Не удалось загрузить компании'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (payload: CompanyFormPayload) => {
    const { data } = await createCompany(payload);
    setCompanies((prev) => [...prev, data]);
  };

  const handleUpdated = (updated: Company) =>
    setCompanies((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

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

  const visible = useMemo(() => {
    const filtered = companies.filter((c) =>
      matchesQuery(query, [c.name, c.contactName, ...c.contactEmails]),
    );
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      // сначала новые; компании без даты уходят в конец
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [companies, query, sort]);

  const { page, totalPages, pageItems, setPage } = usePagination(
    visible,
    `${query}|${sort}`,
  );

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-6">Компании-подрядчики</h1>

      {!isAuditor && (
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-3">Добавить компанию</h2>
        <CompanyForm
          submitLabel="Добавить компанию"
          busyLabel="Добавление..."
          fallbackError="Не удалось создать компанию"
          resetOnSuccess
          onSubmit={handleCreate}
        />
      </div>
      )}

      {companies.length > 0 && (
        <div className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Поиск по названию, контакту или email"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as CompanySort)}
            aria-label="Сортировка компаний"
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(SORT_LABELS) as CompanySort[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      )}

      {companies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Компании ещё не добавлены
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Ничего не найдено
        </div>
      ) : (
        <div className="space-y-3">
          {pageItems.map((c) => (
            <CompanyCard
              key={c.id}
              company={c}
              isAuditor={isAuditor}
              onRequestDelete={setToDelete}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

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
