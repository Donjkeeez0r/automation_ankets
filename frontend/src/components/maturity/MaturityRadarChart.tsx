import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
} from 'recharts';
import { levelColor } from '../../lib/maturity';
import type { MaturityDirectionResult } from '../../types/maturity';

// Цвет цели не совпадает ни с одним цветом уровней, а пунктир различает серии и без цвета
const CURRENT_COLOR = '#2563eb';
const TARGET_COLOR = '#db2777';

interface ChartRow {
  axis: string; // подпись оси — номер направления (полные названия длинные)
  title: string;
  current: number;
  target: number;
  levelName: string | null;
}

function ChartTooltip({ active, payload }: TooltipProps<number, string>) {
  const row = payload?.[0]?.payload as ChartRow | undefined;
  if (!active || !row) return null;
  return (
    <div className="max-w-[260px] rounded-lg bg-gray-900/95 px-3 py-2 text-xs text-white shadow-lg">
      <div className="font-semibold mb-1">
        {row.axis}. {row.title}
      </div>
      <div>
        Текущий уровень: {row.current}
        {row.levelName ? ` — ${row.levelName}` : ''}
      </div>
      <div>Целевой уровень: {row.target}</div>
    </div>
  );
}

// Рендер-функция, а не компонент: recharts кладёт результат в массив (нужен key),
// а в payload передаёт точку диаграммы, где value — текущий уровень направления
function renderLevelDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: { value?: number };
}) {
  const { cx, cy, index } = props;
  const value = props.payload?.value;
  if (cx === undefined || cy === undefined) return <g key={`dot-${index}`} />;
  return (
    <circle
      key={`dot-${index}`}
      cx={cx}
      cy={cy}
      r={5}
      fill={levelColor(value).hex}
      stroke="#ffffff"
      strokeWidth={2}
    />
  );
}

// Для лепестковой диаграммы нужно хотя бы 3 оси — иначе показываем полосы
function LevelBars({ rows }: { rows: ChartRow[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Для лепестковой диаграммы нужно не меньше 3 применимых направлений — профиль
        показан полосами.
      </p>
      {rows.map((row) => (
        <div key={row.axis}>
          <div className="text-sm text-gray-800 mb-1">
            {row.axis}. {row.title}
          </div>
          <div className="relative h-3 rounded-full bg-gray-100">
            <div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${(row.current / 4) * 100}%`,
                backgroundColor: levelColor(row.current).hex,
              }}
            />
            {/* метка цели выступает за полосу — видна и при совпадении с текущим */}
            <div
              className="absolute -inset-y-1.5 w-1 rounded-full"
              style={{
                left: `calc(${(row.target / 4) * 100}% - 2px)`,
                backgroundColor: TARGET_COLOR,
              }}
              title={`Целевой уровень: ${row.target}`}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-xs text-gray-500">
            <span>Текущий: {row.current}</span>
            <span style={{ color: TARGET_COLOR }}>Целевой: {row.target}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MaturityRadarChart({
  directions,
}: {
  directions: MaturityDirectionResult[];
}) {
  const rows: ChartRow[] = directions
    .filter((d) => !d.notApplicable)
    .map((d) => ({
      axis: String(d.direction),
      title: d.title,
      current: d.level ?? 0,
      target: d.targetLevel,
      levelName: d.levelName,
    }));

  if (rows.length === 0) {
    return <div className="text-sm text-gray-500">Нет применимых направлений.</div>;
  }

  if (rows.length < 3) return <LevelBars rows={rows} />;

  // Шкалу 0–4 ставим посередине между первой (верхней) и второй осями, чтобы её
  // подписи не налезали на номера направлений. Оси идут по часовой стрелке от 90°.
  const scaleAngle = 90 - 180 / rows.length;

  return (
    <div className="h-[340px] sm:h-[420px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={rows} outerRadius="72%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="axis" tick={{ fill: '#4b5563', fontSize: 12 }} />
          <PolarRadiusAxis
            domain={[0, 4]}
            tickCount={5}
            angle={scaleAngle}
            // 0 совпадает с центром — подпись там только мешает
            tickFormatter={(v: number) => (v === 0 ? '' : String(v))}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            axisLine={false}
          />
          <Radar
            name="Текущий уровень"
            dataKey="current"
            stroke={CURRENT_COLOR}
            strokeWidth={2}
            fill={CURRENT_COLOR}
            fillOpacity={0.15}
            dot={renderLevelDot}
            activeDot={{ r: 7 }}
            isAnimationActive={false}
          />
          {/* цель рисуется последней — поверх текущего уровня, видна даже при совпадении */}
          <Radar
            name="Целевой уровень"
            dataKey="target"
            stroke={TARGET_COLOR}
            strokeWidth={2.5}
            strokeDasharray="6 4"
            fill="none"
            fillOpacity={0}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Tooltip content={<ChartTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
