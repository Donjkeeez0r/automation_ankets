import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllQuestionnaires, deleteQuestionnaire } from '../../api/questionnaire';
import StatusBadge from '../../components/StatusBadge';
import ConfirmDialog from '../../components/ConfirmDialog';
import SearchInput from '../../components/SearchInput';
import FilterChips, { type FilterChip } from '../../components/FilterChips';
import Pagination from '../../components/Pagination';
import { usePagination } from '../../lib/pagination';
import { matchesQuery } from '../../lib/search';
import type { Questionnaire, Status } from '../../types';

// Группы статусов для чипов: SUBMITTED и IN_REVIEW показываются одинаково
// («На проверке»), поэтому фильтруются одной кнопкой.
type StatusFilter = 'ALL' | 'DRAFT' | 'REVIEW' | 'APPROVED' | 'DECLINED' | 'REVISION';

const STATUS_GROUPS: Record<Exclude<StatusFilter, 'ALL'>, Status[]> = {
  DRAFT: ['DRAFT'],
  REVIEW: ['SUBMITTED', 'IN_REVIEW'],
  APPROVED: ['APPROVED'],
  DECLINED: ['DECLINED'],
  REVISION: ['REVISION'],
};

const STATUS_FILTER_LABELS: Record<Exclude<StatusFilter, 'ALL'>, string> = {
  DRAFT: 'Не заполнена',
  REVIEW: 'На проверке',
  APPROVED: 'Прошёл',
  DECLINED: 'Не прошёл',
  REVISION: 'На доработке',
};

const STATUS_FILTER_ORDER = Object.keys(STATUS_FILTER_LABELS) as Exclude<
  StatusFilter,
  'ALL'
>[];

export default function QuestionnairesListPage() {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [dateAsc, setDateAsc] = useState(false);

  const [toDelete, setToDelete] = useState<Questionnaire | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    getAllQuestionnaires()
      .then((r) => setQuestionnaires(r.data))
      .catch(() => setError('Не удалось загрузить анкеты'))
      .finally(() => setLoading(false));
  }, []);

  const closeDialog = () => {
    setToDelete(null);
    setDeleteError('');
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await deleteQuestionnaire(toDelete.id);
      setQuestionnaires((prev) => prev.filter((q) => q.id !== toDelete.id));
      closeDialog();
    } catch {
      setDeleteError('Не удалось удалить анкету');
    } finally {
      setDeleting(false);
    }
  };

  // Счётчики считаем по всему списку — они не зависят от выбранного чипа,
  // но учитывают поисковый запрос.
  const searched = useMemo(
    () =>
      questionnaires.filter((q) =>
        matchesQuery(query, [q.company?.name, q.company?.contactName]),
      ),
    [questionnaires, query],
  );

  const statusChips = useMemo<FilterChip<StatusFilter>[]>(() => {
    const countOf = (statuses: Status[]) =>
      searched.filter((q) => statuses.includes(q.status)).length;
    return [
      { value: 'ALL', label: 'Все', count: searched.length },
      ...STATUS_FILTER_ORDER.map((key) => ({
        value: key as StatusFilter,
        label: STATUS_FILTER_LABELS[key],
        count: countOf(STATUS_GROUPS[key]),
      })),
    ];
  }, [searched]);

  const visible = useMemo(() => {
    const filtered =
      statusFilter === 'ALL'
        ? searched
        : searched.filter((q) => STATUS_GROUPS[statusFilter].includes(q.status));
    return [...filtered].sort((a, b) => {
      const diff =
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return dateAsc ? diff : -diff;
    });
  }, [searched, statusFilter, dateAsc]);

  const { page, totalPages, pageItems, setPage } = usePagination(
    visible,
    `${query}|${statusFilter}|${dateAsc}`,
  );

  if (loading) return <div className="text-sm text-gray-500">Загрузка...</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">Анкеты</h1>

      {questionnaires.length > 0 && (
        <div className="mb-5 space-y-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Поиск по компании или контакту"
          />
          <FilterChips
            options={statusChips}
            value={statusFilter}
            onChange={setStatusFilter}
            label="Фильтр по статусу"
          />
        </div>
      )}

      {questionnaires.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Анкеты не найдены
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          Ничего не найдено
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 font-medium text-gray-500">Компания</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Контакт</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">
                  <button
                    type="button"
                    onClick={() => setDateAsc((prev) => !prev)}
                    aria-label={`Сортировать по дате создания (${
                      dateAsc ? 'по возрастанию' : 'по убыванию'
                    })`}
                    className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    Дата создания
                    <span aria-hidden="true" className="text-[10px]">
                      {dateAsc ? '▲' : '▼'}
                    </span>
                  </button>
                </th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Статус</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageItems.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {q.company?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {q.company?.contactName ?? '—'}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {new Date(q.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={q.status} />
                    {q.deadlineAt && (
                      <div className="mt-1 text-xs text-gray-500 whitespace-nowrap">
                        Дедлайн:{' '}
                        {new Date(q.deadlineAt).toLocaleDateString('ru-RU', {
                          timeZone: 'UTC',
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <Link
                      to={`/questionnaires/${q.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      Открыть
                    </Link>
                    <button
                      onClick={() => setToDelete(q)}
                      className="ml-4 text-red-600 hover:underline font-medium"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />

      <ConfirmDialog
        open={toDelete !== null}
        title="Удалить анкету?"
        description={
          <>
            <p>
              Анкета компании «{toDelete?.company?.name ?? '—'}» будет удалена
              вместе со всеми ответами, скорингом и ссылками.
            </p>
            <p className="font-medium text-red-600">Действие необратимо.</p>
          </>
        }
        busy={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={closeDialog}
      />
    </div>
  );
}
