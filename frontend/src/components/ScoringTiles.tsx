import type { ScoringResult } from '../types';

interface ScoreTile {
  key: keyof ScoringResult;
  label: string;
  affectsVerdict: boolean;
}

const TILES: ScoreTile[] = [
  { key: 'auditScore',        label: 'Внешний аудит',    affectsVerdict: false },
  { key: 'documentScore',     label: 'Документы ИБ',     affectsVerdict: true },
  { key: 'measuresScore',     label: 'Меры ИБ',          affectsVerdict: true },
  { key: 'gisScore',          label: 'ГИС',              affectsVerdict: true },
  { key: 'pdnScore',          label: 'ПДн',              affectsVerdict: true },
  { key: 'remoteAccessScore', label: 'Удалённый доступ', affectsVerdict: true },
  { key: 'devScore',          label: 'Разработка ПО',    affectsVerdict: true },
  { key: 'contractorsScore',  label: 'Подрядчики',       affectsVerdict: false },
];

interface Hint {
  text: string;
  className: string;
}

function getHint(tileKey: keyof ScoringResult, numVal: number | null): Hint | null {
  switch (tileKey) {
    case 'auditScore':
      if (numVal === 0) return { text: 'Подрядчик не реализует обязательный внешний аудит!', className: 'text-red-600' };
      if (numVal === 1) return { text: 'Подрядчиком реализован обязательный внешний аудит', className: 'text-green-600' };
      return null;
    case 'documentScore':
      if (numVal === 0) return { text: 'Подрядчик не разработал обязательные документы по ИБ!', className: 'text-red-600' };
      if (numVal === 1) return { text: 'Подрядчиком выполнены требования в части документации', className: 'text-green-600' };
      return null;
    case 'measuresScore':
      if (numVal === 0) return { text: 'Подрядчик не внедрил обязательные меры ИБ!', className: 'text-red-600' };
      if (numVal === 1) return { text: 'Подрядчиком внедрены обязательные меры ИБ', className: 'text-green-600' };
      return null;
    case 'gisScore':
      if (numVal === 0) return { text: 'Подрядчик не соответствует требованиям при работе с ГИС!', className: 'text-red-600' };
      if (numVal === null) return { text: 'Участие подрядчика в работах с ГИС не предполагается', className: 'text-gray-500' };
      if (numVal === 1) return { text: 'Подрядчик соответствует требованиям при работе с ГИС', className: 'text-green-600' };
      return null;
    case 'pdnScore':
      if (numVal === 0) return { text: 'Подрядчик не соответствует требованиям при работе с ПДн!', className: 'text-red-600' };
      if (numVal === null) return { text: 'Участие подрядчика в обработке ПДн не предполагается', className: 'text-gray-500' };
      if (numVal === 1) return { text: 'Подрядчик соответствует требованиям при работе с ПДн', className: 'text-green-600' };
      return null;
    case 'remoteAccessScore':
      if (numVal === 0) return { text: 'Подрядчик не соответствует требованиям для удаленного доступа в инфраструктуру РТК!', className: 'text-red-600' };
      if (numVal === null) return { text: 'Удаленный доступ подрядчика не предполагается', className: 'text-gray-500' };
      if (numVal === 1) return { text: 'Подрядчик соответствует требованиям для удаленного доступа в инфраструктуру РТК', className: 'text-green-600' };
      return null;
    case 'devScore':
      if (numVal === 0) return { text: 'Подрядчик не соответствует требованиям по безопасной разработке ПО!', className: 'text-red-600' };
      if (numVal === null) return { text: 'Разработка ПО подрядчиком не предполагается', className: 'text-gray-500' };
      if (numVal === 1) return { text: 'Подрядчик соответствует требованиям по безопасной разработке ПО', className: 'text-green-600' };
      return null;
    case 'contractorsScore':
      if (numVal === 0) return { text: 'Необходимо заполнить перечень подрядчиков!', className: 'text-red-600' };
      if (numVal === 2) return { text: 'Убедитесь что данные подрядчиков заполнены качественно', className: 'text-orange-500' };
      return null;
    default:
      return null;
  }
}

function ScoreTileCard({
  tileKey,
  label,
  value,
  affectsVerdict,
}: {
  tileKey: keyof ScoringResult;
  label: string;
  value: number | null | boolean;
  affectsVerdict: boolean;
}) {
  const numVal = typeof value === 'boolean' ? null : value;

  let bg = 'bg-gray-100 text-gray-500';
  let display = '—';

  if (numVal === 1) {
    bg = 'bg-green-50 border-green-200 text-green-700';
    display = '1';
  } else if (numVal === 0) {
    bg = affectsVerdict
      ? 'bg-red-50 border-red-200 text-red-700'
      : 'bg-yellow-50 border-yellow-200 text-yellow-700';
    display = '0';
  } else if (numVal === 2) {
    bg = 'bg-blue-50 border-blue-200 text-blue-700';
    display = '2';
  }

  const hint = getHint(tileKey, numVal);

  return (
    <div className={`rounded-xl border p-5 flex flex-col items-center gap-2 ${bg}`}>
      <div className="text-3xl font-bold">{display}</div>
      <div className="text-xs font-medium text-center">{label}</div>
      {hint && <div className={`text-xs text-center ${hint.className}`}>{hint.text}</div>}
    </div>
  );
}

export default function ScoringTiles({ scoring }: { scoring: ScoringResult }) {
  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {TILES.map(({ key, label, affectsVerdict }) => (
          <ScoreTileCard
            key={key}
            tileKey={key}
            label={label}
            value={scoring[key] as number | null}
            affectsVerdict={affectsVerdict}
          />
        ))}
      </div>

      <div
        className={`rounded-xl border p-6 text-center ${
          scoring.recommended ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
        }`}
      >
        <div
          className={`text-2xl font-bold ${
            scoring.recommended ? 'text-green-700' : 'text-red-700'
          }`}
        >
          {scoring.recommended ? 'Подрядчик рекомендован' : 'Подрядчик не рекомендован'}
        </div>
      </div>
    </>
  );
}
