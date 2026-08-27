import { useEffect, useState, useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useParams } from 'react-router-dom';
import { getAllQuestions } from '../../api/questionnaire';
import {
  getLinkByToken,
  saveAnswersByToken,
  submitByToken,
  getEmployeesByToken,
  selectEmployeeByToken,
} from '../../api/links';
import {
  uploadArtifactByToken,
  getArtifactsByToken,
  deleteArtifactByToken,
  downloadArtifactByToken,
  saveBlobAs,
  formatFileSize,
} from '../../api/artifacts';
import type {
  Question,
  Answer,
  LinkByToken,
  Artifact,
  ContractorEmployee,
} from '../../types';

const SECTION_LABELS: Record<string, string> = {
  general_info:  '1.1 Общие сведения',
  ib_measures:   '1.2 Меры ИБ',
  remote_access: '2. Удалённый доступ',
  software_dev:  '3. Разработка ПО',
  contractors:   '4. Подрядчики',
};

const TRIGGER_SECTIONS: Record<string, string> = {
  '1.1.10': 'remote_access',
  '1.1.11': 'software_dev',
  '1.1.8':  'contractors',
};

// Вопросы 1.3.1 (ГИС) и 1.4.1 (ПДн) отображаются сразу после 1.2.17 внутри
// раздела "1.2 Меры ИБ"; при ответе "Да" под ними раскрываются вопросы их раздела.
const APPENDED_TRIGGERS: { code: string; section: string }[] = [
  { code: '1.3.1', section: 'gis' },
  { code: '1.4.1', section: 'pdn' },
];

const YESNO_OPTIONS = ['Да', 'Нет'];
const YESNO_NA_OPTIONS = ['Да', 'Нет', 'Не предполагается'];
const YESNO_PARTIAL_OPTIONS = ['Реализовано в полной мере', 'Реализовано частично', 'Не реализовано'];
const YESNO_ARCH_OPTIONS = ['Да', 'Нет', 'Не требуется по архитектуре Организации'];
const YESNO_NOWORK_OPTIONS = ['Да', 'Нет', 'Не предполагается данный вид работ/услуг'];

const SOC_TYPE_OPTIONS = ['Внутренний (собственный)', 'Договор с внешним'];

const ADDITIONAL_VALUE_PLACEHOLDERS: Record<string, string> = {
  '1.1.5': 'Укажите наименование и реквизиты документа',
  '1.1.6': 'Укажите виды лицензируемых работ',
  '1.1.7': 'Укажите виды лицензируемых работ',
  '1.2.1': 'Укажите реквизиты отчета по результатам последнего внешнего аудита ИБ',
  '1.2.2': 'Укажите наименование и реквизиты документа',
  '1.2.3': 'Укажите наименование и реквизиты документа',
  '1.2.4': 'Укажите наименование и реквизиты документа',
  '1.2.5': 'Укажите наименование и реквизиты документа',
  '1.2.6': 'Укажите способ организации SOC',
  '1.2.7': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.8': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.9': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.10': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.11': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.12': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.13': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.14': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.15': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.16': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.2.17': 'Укажите используемые СрЗИ, комментарии к ним',
  '1.3.2': 'Введите ответ...',
  '1.3.3': 'Введите ответ...',
  '1.3.4': 'Введите ответ...',
  '1.3.5': 'Введите ответ...',
  '1.4.2': 'Введите ответ...',
  '1.4.3': 'Введите ответ...',
  '1.4.4': 'Введите ответ...',
  '1.4.5': 'Введите ответ...',
  '1.4.6': 'Введите ответ...',
};

const ADDITIONAL_VALUE_SECTIONS: Record<string, string> = {
  remote_access: 'Опишите реализованную меру...',
  software_dev: 'Опишите реализованную меру...',
};

// Бэкенд отвечает 400 с { message, missingCodes: ['1.2.1', ...] }, если
// не заполнены обязательные вопросы.
function missingCodesFromError(err: unknown): string[] | null {
  const codes = (err as { response?: { data?: { missingCodes?: unknown } } })?.response?.data
    ?.missingCodes;
  if (!Array.isArray(codes) || codes.length === 0) return null;
  return codes.filter((c): c is string => typeof c === 'string');
}

// Анкета уже отправлена, если бэкенд вернул 403 с reason: 'ALREADY_SUBMITTED'
// (ссылка деактивирована после отправки) либо 400 из submitQuestionnaire при
// статусе не DRAFT/REVISION. Для подрядчика это не ошибка: анкета доставлена,
// значит нужно показать экран-подтверждение.
function isAlreadySubmittedError(err: unknown): boolean {
  const data = (err as { response?: { data?: { message?: unknown; reason?: unknown } } })?.response
    ?.data;
  if (data?.reason === 'ALREADY_SUBMITTED') return true;
  return typeof data?.message === 'string' && data.message.includes('уже была отправлена');
}

function triggersAdditionalValue(question: Question, value: string): boolean {
  if (question.type === 'yesno_partial') {
    return value === 'Реализовано в полной мере' || value === 'Реализовано частично';
  }
  if (question.type === 'yesno_nowork') {
    return false;
  }
  return value === 'Да';
}

function AnswerInput({
  question,
  value,
  additionalValue,
  onChange,
  onAdditionalChange,
}: {
  question: Question;
  value: string;
  additionalValue: string;
  onChange: (v: string) => void;
  onAdditionalChange: (v: string) => void;
}) {
  const options =
    question.type === 'yesno'
      ? YESNO_OPTIONS
      : question.type === 'yesno_na'
      ? YESNO_NA_OPTIONS
      : question.type === 'yesno_partial'
      ? YESNO_PARTIAL_OPTIONS
      : question.type === 'yesno_arch'
      ? YESNO_ARCH_OPTIONS
      : question.type === 'yesno_nowork'
      ? YESNO_NOWORK_OPTIONS
      : null;

  if (question.type === 'text') {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        placeholder="Введите ответ..."
      />
    );
  }

  if (options) {
    const additionalPlaceholder =
      ADDITIONAL_VALUE_PLACEHOLDERS[question.code] ?? ADDITIONAL_VALUE_SECTIONS[question.section];
    const showAdditional = triggersAdditionalValue(question, value);
    const isSocType = question.code === '1.2.6' && value === 'Да';
    return (
      <div>
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                value === opt
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
        {isSocType ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {SOC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onAdditionalChange(opt)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  additionalValue === opt
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          additionalPlaceholder &&
          showAdditional && (
            <textarea
              value={additionalValue}
              onChange={(e) => onAdditionalChange(e.target.value)}
              rows={2}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={additionalPlaceholder}
            />
          )
        )}
      </div>
    );
  }

  return null;
}

// Заметный блок вверху формы: сотрудник ПАО / аудитор направил подрядчику
// гарантийное письмо на подписание. Показывается только при наличии таких
// файлов и намеренно отделён от списка вложений самого подрядчика.
function GuaranteeLetterBlock({
  token,
  letters,
}: {
  token: string;
  letters: Artifact[];
}) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  if (letters.length === 0) return null;

  const download = async (artifact: Artifact) => {
    setDownloadingId(artifact.id);
    setError('');
    try {
      const { data } = await downloadArtifactByToken(token, artifact.id);
      saveBlobAs(data, artifact.fileName);
    } catch {
      setError(`Не удалось скачать файл «${artifact.fileName}».`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="mb-6 rounded-xl border-2 border-blue-300 bg-blue-50 overflow-hidden">
      <div className="px-6 py-4 flex items-start gap-3">
        <div className="text-2xl leading-none" aria-hidden="true">
          📄
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-bold text-blue-900">
            Вам направлено гарантийное письмо для подписания
          </h2>
          <p className="text-sm text-blue-800 mt-1">
            Скачайте файл, подпишите его и приложите скан в блоке «Прикреплённые
            файлы» внизу формы.
          </p>
        </div>
      </div>
      <ul className="divide-y divide-blue-200 border-t border-blue-200">
        {letters.map((l) => (
          <li key={l.id} className="flex items-center gap-3 px-6 py-3">
            <span className="flex-1 min-w-0 text-sm font-medium text-blue-900 truncate">
              {l.fileName}
            </span>
            <span className="shrink-0 text-xs text-blue-700">
              {formatFileSize(l.size)}
            </span>
            <button
              type="button"
              onClick={() => void download(l)}
              disabled={downloadingId === l.id}
              className="shrink-0 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {downloadingId === l.id ? 'Скачивание...' : 'Скачать'}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <div className="px-6 py-3 text-sm text-red-700 bg-red-50 border-t border-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

// Блок прикрепления файлов для подрядчика — работает по публичным
// эндпоинтам /links/:token/artifacts, без JWT. Показывает только вложения
// самого подрядчика: гарантийные письма живут в отдельном блоке сверху.
function ArtifactsBlock({
  token,
  files,
  setFiles,
}: {
  token: string;
  files: Artifact[];
  setFiles: Dispatch<SetStateAction<Artifact[]>>;
}) {
  const [uploading, setUploading] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const ownFiles = files.filter((f) => f.type !== 'guarantee_letter');

  const upload = async (selected: FileList | null) => {
    if (!selected || selected.length === 0) return;
    setUploading(true);
    setError('');
    try {
      for (const file of Array.from(selected)) {
        const { data } = await uploadArtifactByToken(token, file);
        setFiles((prev) => [data, ...prev]);
      }
    } catch {
      setError('Не удалось загрузить файл. Попробуйте ещё раз.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const remove = async (id: string) => {
    setRemovingId(id);
    setError('');
    try {
      await deleteArtifactByToken(token, id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
    } catch {
      setError('Не удалось удалить файл.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-800">Прикреплённые файлы</h2>
      </div>
      <div className="p-6">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void upload(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg px-4 py-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-blue-400 bg-gray-50/50'
          }`}
        >
          <div className="text-2xl mb-2">📎</div>
          <p className="text-sm text-gray-600">
            Перетащите файлы сюда или{' '}
            <span className="text-blue-600 font-medium">выберите на компьютере</span>
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
        </div>

        {uploading && <div className="mt-3 text-sm text-gray-500">Загрузка файла...</div>}
        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        {ownFiles.length > 0 && (
          <ul className="mt-4 divide-y divide-gray-100 border border-gray-200 rounded-lg">
            {ownFiles.map((f) => (
              <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex-1 min-w-0 text-sm text-gray-800 truncate">{f.fileName}</span>
                <span className="shrink-0 text-xs text-gray-400">{formatFileSize(f.size)}</span>
                <button
                  type="button"
                  onClick={() => void remove(f.id)}
                  disabled={removingId === f.id}
                  className="shrink-0 text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  {removingId === f.id ? 'Удаление...' : 'Удалить'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Вводный экран с правилами заполнения: те же пункты, что и в письме со
// ссылкой (links.service.ts). Показывается один раз за визит — состояние
// живёт только в памяти вкладки, при перезагрузке экран появится снова.
function FillIntro({
  companyName,
  fillDeadlineAt,
  onStart,
}: {
  companyName?: string;
  fillDeadlineAt?: string | null;
  onStart: () => void;
}) {
  const deadline = fillDeadlineAt ? new Date(fillDeadlineAt) : null;
  const deadlineText =
    deadline && !Number.isNaN(deadline.getTime())
      ? deadline.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
      : null;

  const rules = [
    'Все ответы должны быть развёрнутыми и содержательными — формальные отписки не принимаются и будут возвращены на доработку.',
    'Вопросы, отмеченные звёздочкой (*), обязательны для ответа.',
    'При необходимости прикладывайте подтверждающие документы (файлы) — это ускорит проверку.',
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Анкетирование ИБ
          </div>
          <h1 className="text-xl font-bold text-gray-900">Прежде чем начать заполнение</h1>
          {companyName && (
            <p className="text-sm text-gray-500 mt-0.5">Компания: {companyName}</p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <ul className="space-y-3">
            {rules.map((rule) => (
              <li key={rule} className="flex gap-3 text-sm text-gray-700">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>

          {deadlineText && (
            <div className="mt-5 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
              <span className="font-medium">Заполнить нужно до:</span> {deadlineText}
            </div>
          )}

          <button
            type="button"
            onClick={onStart}
            className="mt-6 w-full px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Начать заполнение
          </button>
        </div>
      </div>
    </div>
  );
}

// Экран «кто заполняет анкету»: показывается один раз, пока в анкете не
// проставлен filledByEmployee. Список сотрудников ведёт сотрудник КОМПАНИИ.
// Если список пуст, выбирать не из чего — сообщаем родителю через onEmpty,
// и подрядчик заполняет анкету анонимно, без вызова select-employee.
function EmployeeSelect({
  token,
  companyName,
  onSelected,
  onEmpty,
}: {
  token: string;
  companyName?: string;
  onSelected: (employee: ContractorEmployee) => void;
  onEmpty: () => void;
}) {
  const [employees, setEmployees] = useState<ContractorEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getEmployeesByToken(token)
      .then((r) => {
        setEmployees(r.data);
        if (r.data.length === 0) onEmpty();
      })
      .catch(() => setError('Не удалось загрузить список сотрудников.'))
      .finally(() => setLoading(false));
    // onEmpty — стабильный setState-сеттер, перезапрашивать список не нужно
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const select = async (employee: ContractorEmployee) => {
    setSavingId(employee.id);
    setError('');
    try {
      await selectEmployeeByToken(token, employee.id);
      onSelected(employee);
    } catch {
      setError('Не удалось сохранить выбор. Попробуйте ещё раз.');
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Анкетирование ИБ
          </div>
          <h1 className="text-xl font-bold text-gray-900">Выберите себя из списка</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Укажите, кто заполняет анкету{companyName ? ` от компании ${companyName}` : ''}.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {loading ? (
            <div className="text-sm text-gray-500">Загрузка списка сотрудников...</div>
          ) : employees.length === 0 ? (
            // Пустой список: родитель уже получил onEmpty и переключается на форму
            <div className="text-sm text-gray-500">Открываем анкету...</div>
          ) : (
            <ul className="space-y-2">
              {employees.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => void select(e)}
                    disabled={savingId !== null}
                    className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 disabled:opacity-50 transition-colors"
                  >
                    <div className="text-sm font-medium text-gray-900">{e.name}</div>
                    {e.position && (
                      <div className="text-xs text-gray-500 mt-0.5">{e.position}</div>
                    )}
                    {savingId === e.id && (
                      <div className="text-xs text-blue-600 mt-1">Сохранение...</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FillPage() {
  const { token } = useParams<{ token: string }>();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [link, setLink] = useState<LinkByToken | null>(null);
  // ключ — questionId
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [additionalValues, setAdditionalValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [loading, setLoading] = useState(true);
  // Вводный экран с правилами: показывается один раз за визит, перед выбором
  // сотрудника и формой. Состояние не сохраняется между открытиями ссылки.
  const [introDone, setIntroDone] = useState(false);
  // null — сотрудник ещё не выбран, показываем экран выбора вместо формы
  const [filledBy, setFilledBy] = useState<ContractorEmployee | null>(null);
  // у компании нет сотрудников — выбирать не из чего, пускаем к форме анонимно
  const [noEmployees, setNoEmployees] = useState(false);
  // Файлы анкеты: и вложения подрядчика, и гарантийные письма от ПАО.
  // Держим список здесь, чтобы одним запросом накормить оба блока.
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([getAllQuestions(), getLinkByToken(token)])
      .then(([qRes, linkRes]) => {
        setQuestions(qRes.data);
        setLink(linkRes.data);
        const existing: Record<string, string> = {};
        const existingAdditional: Record<string, string> = {};
        for (const a of linkRes.data.questionnaire.answers ?? []) {
          existing[a.questionId] = a.value;
          if (a.additionalValue) existingAdditional[a.questionId] = a.additionalValue;
        }
        setAnswers(existing);
        setAdditionalValues(existingAdditional);
        setFilledBy(linkRes.data.questionnaire.filledByEmployee ?? null);
      })
      .catch((err) => {
        // Ссылку деактивирует отправка анкеты — при повторном заходе показываем
        // подтверждение отправки, а не «Ссылка недоступна».
        if (isAlreadySubmittedError(err)) setSubmitted(true);
        else setInvalid(true);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    // Ошибку намеренно глушим: недоступный список файлов не должен мешать
    // заполнению анкеты — блоки просто отрисуются пустыми.
    getArtifactsByToken(token)
      .then((r) => setArtifacts(r.data))
      .catch(() => undefined);
  }, [token]);

  const getVisibleSections = useCallback(() => {
    const visible = new Set(['general_info', 'ib_measures']);
    for (const [code, section] of Object.entries(TRIGGER_SECTIONS)) {
      const triggerQ = questions.find((q) => q.code === code);
      if (triggerQ && answers[triggerQ.id] === 'Да') {
        visible.add(section);
      }
    }
    return visible;
  }, [questions, answers]);

  const handleAnswer = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  };

  const handleAdditionalAnswer = (questionId: string, value: string) => {
    setAdditionalValues((prev) => ({ ...prev, [questionId]: value }));
    setSaved(false);
  };

  const doSave = async () => {
    if (!token) return;
    const payload: Answer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
      additionalValue: additionalValues[questionId] || undefined,
    }));
    await saveAnswersByToken(token, payload);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await doSave();
      setSaved(true);
    } catch {
      setError('Не удалось сохранить ответы');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) return;
    setSubmitting(true);
    setError('');
    try {
      await doSave();
      await submitByToken(token);
      setSubmitted(true);
    } catch (err) {
      if (isAlreadySubmittedError(err)) {
        setSubmitted(true);
        return;
      }
      const missing = missingCodesFromError(err);
      setError(
        missing
          ? `Заполните обязательные вопросы: ${missing.join(', ')}`
          : 'Не удалось отправить анкету',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-sm text-gray-500">
        Загрузка...
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">Ссылка недоступна</h1>
          <p className="text-sm text-gray-500">
            Ссылка недействительна или срок её действия истёк. Обратитесь к сотруднику,
            который её предоставил.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl border border-gray-200 p-8 max-w-md text-center">
          <div className="text-3xl mb-3">✅</div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">
            Анкета успешно отправлена
          </h1>
          <p className="text-sm text-gray-500">
            Спасибо! Ваши ответы и приложенные файлы переданы на проверку.
            Мы свяжемся с вами после её завершения. Эту вкладку можно закрыть.
          </p>
        </div>
      </div>
    );
  }

  if (!link) return null;

  if (!introDone) {
    return (
      <FillIntro
        companyName={link.questionnaire.company?.name}
        fillDeadlineAt={link.questionnaire.fillDeadlineAt}
        onStart={() => setIntroDone(true)}
      />
    );
  }

  // Пока подрядчик не указал, кто заполняет анкету, форму не показываем.
  if (!filledBy && !noEmployees && token) {
    return (
      <EmployeeSelect
        token={token}
        companyName={link.questionnaire.company?.name}
        onSelected={setFilledBy}
        onEmpty={() => setNoEmployees(true)}
      />
    );
  }

  // Обязательность вопроса для этой анкеты: индивидуальное переопределение,
  // если оно задано сотрудником, иначе глобальное значение вопроса.
  const overrideMap = new Map(
    (link.questionnaire.overrides ?? []).map((o) => [o.questionId, o.required]),
  );
  const isRequired = (q: Question) => overrideMap.get(q.id) ?? q.required;

  const visibleSections = getVisibleSections();
  const sectionKeys = Object.keys(SECTION_LABELS).filter((s) => visibleSections.has(s));

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">
            Анкетирование ИБ
          </div>
          <h1 className="text-xl font-bold text-gray-900">Заполнение анкеты</h1>
          {link.questionnaire.company?.name && (
            <p className="text-sm text-gray-500 mt-0.5">
              Компания: {link.questionnaire.company.name}
            </p>
          )}
          <p className="text-sm text-gray-500 mt-0.5">
            Заполняет:{' '}
            {filledBy
              ? `${filledBy.name}${filledBy.position ? ` (${filledBy.position})` : ''}`
              : 'Аноним'}
          </p>
        </div>

        {link.questionnaire.comment && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800">
            <span className="font-medium">Комментарий проверяющего:</span>{' '}
            {link.questionnaire.comment}
          </div>
        )}

        {token && (
          <GuaranteeLetterBlock
            token={token}
            letters={artifacts.filter((a) => a.type === 'guarantee_letter')}
          />
        )}

        <div className="space-y-6">
          {sectionKeys.map((sectionKey) => {
            let sectionQuestions = questions
              .filter((q) => q.section === sectionKey)
              .sort((a, b) => a.order - b.order);

            if (sectionKey === 'ib_measures') {
              for (const { code, section } of APPENDED_TRIGGERS) {
                const triggerQ = questions.find((q) => q.code === code);
                if (!triggerQ) continue;
                sectionQuestions = [...sectionQuestions, triggerQ];
                if (answers[triggerQ.id] === 'Да') {
                  const childQuestions = questions
                    .filter((q) => q.section === section && q.code !== code)
                    .sort((a, b) => a.order - b.order);
                  sectionQuestions = [...sectionQuestions, ...childQuestions];
                }
              }
            }

            if (sectionQuestions.length === 0) return null;

            return (
              <div
                key={sectionKey}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <h2 className="text-sm font-semibold text-gray-800">
                    {SECTION_LABELS[sectionKey]}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {sectionQuestions.map((q) => (
                    <div
                      key={q.id}
                      className={`px-6 py-4 ${
                        (q.section === 'gis' || q.section === 'pdn') && q.order > 1
                          ? 'pl-10 bg-gray-50/50'
                          : ''
                      }`}
                    >
                      <p className="text-sm text-gray-800 mb-3">
                        <span className="font-medium text-gray-400 mr-2">{q.code}</span>
                        {q.text}
                        {isRequired(q) && (
                          <span className="text-red-600 ml-1" aria-label="Обязательный вопрос">
                            *
                          </span>
                        )}
                      </p>
                      <AnswerInput
                        question={q}
                        value={answers[q.id] ?? ''}
                        additionalValue={additionalValues[q.id] ?? ''}
                        onChange={(v) => handleAnswer(q.id, v)}
                        onAdditionalChange={(v) => handleAdditionalAnswer(q.id, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {token && (
            <ArtifactsBlock token={token} files={artifacts} setFiles={setArtifacts} />
          )}
        </div>

        {error && (
          <div className="mt-6 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Сохранение...' : saved ? 'Сохранено ✓' : 'Сохранить черновик'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Отправка...' : 'Отправить анкету'}
          </button>
        </div>
      </div>
    </div>
  );
}
