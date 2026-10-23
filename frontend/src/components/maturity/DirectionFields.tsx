import { formatNumber, type MaturityDraft } from '../../lib/maturity';
import type { MaturityReference } from '../../types/maturity';

const textareaClass =
  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y';

// Поля одного направления: «неприменимо», 8 видов требований с вариантами
// и комментарий. Используется в форме подрядчика и при правке сотрудником.
export default function DirectionFields({
  direction,
  reference,
  draft,
  onChange,
  showValues = false,
  showMissing = false,
}: {
  direction: number;
  reference: MaturityReference;
  draft: MaturityDraft;
  onChange: (patch: Partial<MaturityDraft>) => void;
  // показывать числовое значение варианта (у сотрудника)
  showValues?: boolean;
  // подсветить невыбранные оценки и пустую причину
  showMissing?: boolean;
}) {
  const reasonMissing = draft.notApplicable && !draft.comment.trim();
  const commentId = `maturity-comment-${direction}`;

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.notApplicable}
          onChange={(e) => onChange({ notApplicable: e.target.checked })}
          className="mt-0.5 h-4 w-4 accent-blue-600 shrink-0"
        />
        <span>
          <span className="block text-sm font-medium text-gray-800">
            Направление неприменимо
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Отметьте, если соответствующие процессы или технологии в организации не
            используются. Направление будет исключено из оценки, причину нужно указать.
          </span>
        </span>
      </label>

      {draft.notApplicable ? (
        <p className="text-xs text-gray-500">
          Оценки по неприменимому направлению не выбираются.
        </p>
      ) : (
        reference.requirementTypes.map((type, index) => {
          const value = draft[type.key];
          const missing = showMissing && value === null;
          return (
            <fieldset key={type.key} className="min-w-0">
              <legend className="text-sm font-semibold text-gray-900">
                {index + 1}. {type.title}
                {missing && (
                  <span className="ml-2 text-xs font-medium text-red-600">не выбрано</span>
                )}
              </legend>
              <p className="mt-0.5 mb-2 text-xs text-gray-500">{type.description}</p>
              <div className="space-y-2">
                {type.options.map((opt) => {
                  const selected = value === opt.value;
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                        selected
                          ? 'border-blue-600 bg-blue-50 text-gray-900'
                          : missing
                            ? 'border-red-200 bg-white text-gray-700 hover:border-blue-400'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-400'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`maturity-${direction}-${type.key}`}
                        checked={selected}
                        onChange={() => onChange({ [type.key]: opt.value })}
                        className="mt-0.5 h-4 w-4 accent-blue-600 shrink-0"
                      />
                      <span className="flex-1 leading-snug">{opt.label}</span>
                      {showValues && (
                        <span className="shrink-0 text-xs font-semibold text-gray-400">
                          {formatNumber(opt.value)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      )}

      <div>
        <label htmlFor={commentId} className="block text-sm font-medium text-gray-800 mb-1">
          {draft.notApplicable ? (
            <>
              Укажите причину <span className="text-red-600">*</span>
            </>
          ) : (
            'Комментарий (необязательно)'
          )}
        </label>
        <textarea
          id={commentId}
          value={draft.comment}
          onChange={(e) => onChange({ comment: e.target.value })}
          rows={2}
          maxLength={2000}
          aria-required={draft.notApplicable}
          placeholder={
            draft.notApplicable
              ? 'Например: беспроводные сети в организации не используются'
              : 'Пояснения, ссылки на подтверждающие документы'
          }
          className={`${textareaClass} ${
            showMissing && reasonMissing ? 'border-red-300' : 'border-gray-300'
          }`}
        />
        {showMissing && reasonMissing && (
          <p className="mt-1 text-xs text-red-600">
            Для неприменимого направления причина обязательна.
          </p>
        )}
      </div>
    </div>
  );
}
