import PDFDocument from 'pdfkit';
import { FONT_BOLD_PATH, FONT_PATH } from './pdf-fonts';
import {
  REQUIREMENT_KEYS,
  REQUIREMENT_TYPES,
  RequirementKey,
} from '../maturity/maturity.constants';

type Doc = PDFKit.PDFDocument;

export interface PdfHeaderData {
  companyName: string;
  companyInn: string | null;
  filledBy: string | null;
  owner: string;
  createdAt: Date;
  status: string;
  generatedAt: Date;
}

export interface PdfQuestion {
  id: string;
  code: string;
  section: string;
  text: string;
  order: number;
  groupLabel: string | null;
  additionalLabel: string | null;
}

export interface PdfAnswer {
  questionId: string;
  value: string;
  additionalValue: string | null;
}

export interface PdfFile {
  fileName: string;
  type: string;
  questionId: string | null;
}

export interface SectionRelevance {
  gisRelevant: boolean;
  pdnRelevant: boolean;
  remoteRelevant: boolean;
  devRelevant: boolean;
  contractorsRelevant: boolean;
}

export interface SecurityPdfInput {
  header: PdfHeaderData;
  comment: string | null;
  questions: PdfQuestion[];
  answers: PdfAnswer[];
  files: PdfFile[];
  relevance: SectionRelevance;
}

export interface MaturityPdfDirection {
  direction: number;
  title: string;
  notApplicable: boolean;
  p: number | null;
  level: number | null;
  levelName: string | null;
  meetsTarget: boolean | null;
  gapTitles: string[];
  comment: string | null;
}

export interface MaturityPdfInput {
  header: PdfHeaderData;
  comment: string | null;
  result: {
    overall: number | null;
    overallLevel: number | null;
    overallLevelName: string | null;
    overallLevelDescription: string | null;
    targetLevel: number;
    targetLevelName: string;
    objectCategoryLabel: string | null;
    applicableCount: number;
    belowTargetCount: number;
    directions: MaturityPdfDirection[];
  };
  values: Record<number, Partial<Record<RequirementKey, number | null>>>;
}

export const SECTION_LABELS: Record<string, string> = {
  general_info: '1.1 Общие сведения',
  ib_measures: '1.2 Меры ИБ',
  remote_access: '2. Удалённый доступ',
  software_dev: '3. Разработка ПО',
  contractors: '4. Подрядчики',
};

const APPENDED_SECTION_LABELS: Record<string, string> = {
  gis: '1.3 ГИС',
  pdn: '1.4 Персональные данные',
};

const SECTION_TRIGGERS: Record<
  string,
  { code: string; key: keyof SectionRelevance }
> = {
  remote_access: { code: '1.1.10', key: 'remoteRelevant' },
  software_dev: { code: '1.1.11', key: 'devRelevant' },
  contractors: { code: '1.1.8', key: 'contractorsRelevant' },
};

const APPENDED_TRIGGERS: {
  code: string;
  section: string;
  key: keyof SectionRelevance;
}[] = [
  { code: '1.3.1', section: 'gis', key: 'gisRelevant' },
  { code: '1.4.1', section: 'pdn', key: 'pdnRelevant' },
];

export type SecurityBlock =
  | { kind: 'group'; title: string; note?: string }
  | {
      kind: 'question';
      questionId: string;
      code: string;
      text: string;
      answer: string | null;
      additionalLabel: string;
      additionalValue: string | null;
      files: string[];
      indent: boolean;
    }
  | { kind: 'note'; text: string; indent: boolean };

export interface SecuritySection {
  title: string;
  notApplicable: string | null; // причина, если раздел не применим
  blocks: SecurityBlock[];
}

function splitGroupLabel(groupLabel: string): { title: string; note?: string } {
  const [firstLine, ...restLines] = groupLabel.split('\n');
  const rest = restLines.join(' ').trim();
  if (rest) return { title: firstLine.trim(), note: rest };

  const match = firstLine.match(/^(.*?)\s*(\([^()]*(?:\([^()]*\)[^()]*)*\))$/);
  if (match && match[1].trim()) {
    return { title: match[1].trim(), note: match[2] };
  }

  return { title: firstLine.trim() };
}

const byOrder = (a: PdfQuestion, b: PdfQuestion) => a.order - b.order;

export function buildSecuritySections(input: SecurityPdfInput): {
  sections: SecuritySection[];
  generalFiles: string[];
} {
  const { questions, relevance } = input;
  const answerById = new Map(input.answers.map((a) => [a.questionId, a]));
  const answerByCode = (code: string) => {
    const q = questions.find((x) => x.code === code);
    return q ? (answerById.get(q.id)?.value.trim() ?? '') : '';
  };
  const reason = (code: string) => {
    const value = answerByCode(code);
    return value
      ? `ответ на вопрос ${code} — «${value}»`
      : `нет ответа на вопрос ${code}`;
  };

  const filesByQuestion = new Map<string, string[]>();
  for (const f of input.files) {
    if (!f.questionId) continue;
    const list = filesByQuestion.get(f.questionId) ?? [];
    list.push(f.fileName);
    filesByQuestion.set(f.questionId, list);
  }

  const rendered = new Set<string>();

  const toBlocks = (list: PdfQuestion[], indent = false): SecurityBlock[] => {
    const blocks: SecurityBlock[] = [];
    for (const q of list) {
      if (q.groupLabel) {
        blocks.push({ kind: 'group', ...splitGroupLabel(q.groupLabel) });
      }
      const answer = answerById.get(q.id);
      rendered.add(q.id);
      blocks.push({
        kind: 'question',
        questionId: q.id,
        code: q.code,
        text: q.text,
        answer: answer?.value.trim() || null,
        additionalLabel: q.additionalLabel || 'Комментарий',
        additionalValue: answer?.additionalValue?.trim() || null,
        files: filesByQuestion.get(q.id) ?? [],
        indent,
      });
    }
    return blocks;
  };

  const sections: SecuritySection[] = [];

  for (const [key, title] of Object.entries(SECTION_LABELS)) {
    const trigger = SECTION_TRIGGERS[key];
    if (trigger && !relevance[trigger.key]) {
      sections.push({
        title,
        notApplicable: `Раздел не применим: ${reason(trigger.code)}.`,
        blocks: [],
      });
      continue;
    }

    const blocks = toBlocks(
      questions.filter((q) => q.section === key).sort(byOrder),
    );

    if (key === 'ib_measures') {
      for (const appended of APPENDED_TRIGGERS) {
        const triggerQ = questions.find((q) => q.code === appended.code);
        if (!triggerQ) continue;
        blocks.push(...toBlocks([triggerQ]));

        const children = questions
          .filter((q) => q.section === appended.section && q.id !== triggerQ.id)
          .sort(byOrder);
        if (children.length === 0) continue;

        if (relevance[appended.key]) {
          blocks.push(...toBlocks(children, true));
        } else {
          blocks.push({
            kind: 'note',
            text: `Раздел «${APPENDED_SECTION_LABELS[appended.section]}» не применим: ${reason(appended.code)}.`,
            indent: true,
          });
        }
      }
    }

    if (blocks.length > 0) {
      sections.push({ title, notApplicable: null, blocks });
    }
  }

  const known = new Set([
    ...Object.keys(SECTION_LABELS),
    ...Object.keys(APPENDED_SECTION_LABELS),
  ]);
  const extra = questions
    .filter((q) => !known.has(q.section) && answerById.has(q.id))
    .sort((a, b) => a.section.localeCompare(b.section) || byOrder(a, b));
  if (extra.length > 0) {
    sections.push({
      title: 'Прочие вопросы',
      notApplicable: null,
      blocks: toBlocks(extra),
    });
  }

  const codeById = new Map(questions.map((q) => [q.id, q.code]));
  const generalFiles = input.files
    .filter((f) => !f.questionId || !rendered.has(f.questionId))
    .map((f) => {
      const parts = [f.fileName];
      if (f.type === 'guarantee_letter') parts.push('гарантийное письмо');
      const code = f.questionId ? codeById.get(f.questionId) : undefined;
      if (code) parts.push(`к вопросу ${code}`);
      return parts.length > 1
        ? `${parts[0]} (${parts.slice(1).join(', ')})`
        : parts[0];
    });

  return { sections, generalFiles };
}

const MARGIN = 50;
const FOOTER_GAP = 28;

const COLOR = {
  text: '#111827',
  muted: '#6b7280',
  light: '#9ca3af',
  accent: '#1f2937',
  border: '#d1d5db',
  fill: '#f3f4f6',
};

const formatDate = (d: Date) => d.toLocaleDateString('ru-RU');
const formatDateTime = (d: Date) =>
  d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const formatNumber = (v: number | null) =>
  v === null ? '—' : String(v).replace('.', ',');
const formatP = (v: number | null) =>
  v === null
    ? '—'
    : v.toLocaleString('ru-RU', {
        minimumFractionDigits: 3,
        maximumFractionDigits: 3,
      });

function createDoc(title: string): Doc {
  const doc = new PDFDocument({
    size: 'A4',
    margin: MARGIN,
    bufferPages: true,
    info: { Title: title, Author: 'ПАО Ростелеком' },
  });
  doc.registerFont('main', FONT_PATH);
  doc.registerFont('main-bold', FONT_BOLD_PATH);
  doc.font('main').fillColor(COLOR.text);
  return doc;
}

const contentWidth = (doc: Doc) =>
  doc.page.width - doc.page.margins.left - doc.page.margins.right;
const pageBottom = (doc: Doc) => doc.page.height - doc.page.margins.bottom;

function ensureSpace(doc: Doc, height: number) {
  if (doc.y + height > pageBottom(doc)) doc.addPage();
}

function measure(
  doc: Doc,
  text: string,
  font: string,
  size: number,
  width: number,
): number {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width });
}

function para(
  doc: Doc,
  text: string,
  opts: {
    font?: string;
    size?: number;
    color?: string;
    indent?: number;
    width?: number;
    gap?: number;
  } = {},
) {
  const indent = opts.indent ?? 0;
  doc
    .font(opts.font ?? 'main')
    .fontSize(opts.size ?? 10)
    .fillColor(opts.color ?? COLOR.text)
    .text(text, doc.page.margins.left + indent, doc.y, {
      width: opts.width ?? contentWidth(doc) - indent,
    });
  if (opts.gap) doc.moveDown(opts.gap);
}

function rule(doc: Doc, gapAfter = 0.6) {
  const y = doc.y;
  doc
    .moveTo(doc.page.margins.left, y)
    .lineTo(doc.page.width - doc.page.margins.right, y)
    .lineWidth(0.5)
    .strokeColor(COLOR.border)
    .stroke();
  doc.moveDown(gapAfter);
}

function renderTitle(doc: Doc, documentName: string) {
  para(doc, 'Анкета из системы', {
    font: 'main-bold',
    size: 11,
    color: COLOR.accent,
    gap: 0.2,
  });
  para(doc, documentName, { font: 'main-bold', size: 16, gap: 0.6 });
  rule(doc);
}

function renderHeader(doc: Doc, h: PdfHeaderData) {
  const rows: [string, string][] = [
    ['Компания-подрядчик', h.companyName],
    ['ИНН', h.companyInn || '—'],
    ['Заполнил', h.filledBy || 'Аноним'],
    ['Ответственный сотрудник', h.owner],
    ['Дата создания', formatDate(h.createdAt)],
    ['Статус', h.status],
    ['Дата формирования PDF', formatDateTime(h.generatedAt)],
  ];

  const labelWidth = 160;
  const left = doc.page.margins.left;
  const valueWidth = contentWidth(doc) - labelWidth;

  for (const [label, value] of rows) {
    const height = Math.max(
      measure(doc, label, 'main', 10, labelWidth - 8),
      measure(doc, value, 'main-bold', 10, valueWidth),
    );
    ensureSpace(doc, height);
    const y = doc.y;
    doc
      .font('main')
      .fontSize(10)
      .fillColor(COLOR.muted)
      .text(label, left, y, { width: labelWidth - 8 });
    doc
      .font('main-bold')
      .fontSize(10)
      .fillColor(COLOR.text)
      .text(value, left + labelWidth, y, { width: valueWidth });
    doc.y = y + height + 3;
  }
  doc.moveDown(0.4);
  rule(doc, 0.8);
}

function renderSectionTitle(doc: Doc, title: string, keepWith = 60) {
  const height = measure(doc, title, 'main-bold', 13, contentWidth(doc));
  ensureSpace(doc, height + 8 + keepWith);
  doc.moveDown(0.3);
  para(doc, title, { font: 'main-bold', size: 13, color: COLOR.accent });
  doc.moveDown(0.4);
}

function renderTextBlock(doc: Doc, title: string, text: string) {
  renderSectionTitle(doc, title, 30);
  para(doc, text, { size: 10, gap: 0.6 });
}

function renderFooters(doc: Doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('main')
      .fontSize(8)
      .fillColor(COLOR.light)
      .text(
        `Стр. ${i - range.start + 1} из ${range.count}`,
        doc.page.margins.left,
        doc.page.height - FOOTER_GAP,
        { width: contentWidth(doc), align: 'center', lineBreak: false },
      );
    doc.page.margins.bottom = bottom;
  }
}

function toBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    renderFooters(doc);
    doc.end();
  });
}

const INDENT = 16;
const ANSWER_INDENT = 12;
const KEEP_ANSWER_LINES = 2;

function renderQuestion(
  doc: Doc,
  q: Extract<SecurityBlock, { kind: 'question' }>,
) {
  const indent = q.indent ? INDENT : 0;
  const width = contentWidth(doc) - indent;
  const answerWidth = width - ANSWER_INDENT;
  const title = `${q.code}  ${q.text}`;
  const answerText = q.answer ?? 'Нет ответа';

  const titleHeight = measure(doc, title, 'main-bold', 10, width);
  const lineHeight = measure(doc, 'Ж', 'main', 10, answerWidth);
  const answerHeight = Math.min(
    measure(doc, answerText, 'main', 10, answerWidth),
    lineHeight * KEEP_ANSWER_LINES,
  );
  const pageSpace = pageBottom(doc) - doc.page.margins.top;
  ensureSpace(doc, Math.min(titleHeight + 3 + answerHeight, pageSpace));

  para(doc, title, { font: 'main-bold', size: 10, indent });
  doc.moveDown(0.15);
  para(doc, answerText, {
    size: 10,
    indent: indent + ANSWER_INDENT,
    color: q.answer ? COLOR.text : COLOR.light,
  });

  if (q.additionalValue) {
    const label = `${q.additionalLabel}:`;
    ensureSpace(
      doc,
      measure(doc, label, 'main-bold', 9, answerWidth) + lineHeight,
    );
    doc.moveDown(0.15);
    para(doc, label, {
      font: 'main-bold',
      size: 9,
      color: COLOR.muted,
      indent: indent + ANSWER_INDENT,
    });
    para(doc, q.additionalValue, {
      size: 10,
      indent: indent + ANSWER_INDENT,
    });
  }

  if (q.files.length > 0) {
    doc.moveDown(0.15);
    para(doc, `Приложения: ${q.files.join(', ')}`, {
      size: 9,
      color: COLOR.muted,
      indent: indent + ANSWER_INDENT,
    });
  }

  doc.moveDown(0.6);
}

export async function renderSecurityPdf(
  input: SecurityPdfInput,
): Promise<Buffer> {
  const title = 'Анкета информационной безопасности';
  const doc = createDoc(title);
  const { sections, generalFiles } = buildSecuritySections(input);

  renderTitle(doc, title);
  renderHeader(doc, input.header);

  if (input.comment?.trim()) {
    renderTextBlock(doc, 'Комментарий сотрудника', input.comment.trim());
  }

  for (const section of sections) {
    renderSectionTitle(doc, section.title);

    if (section.notApplicable) {
      para(doc, section.notApplicable, {
        size: 10,
        color: COLOR.muted,
        gap: 0.6,
      });
      continue;
    }

    for (let i = 0; i < section.blocks.length; i++) {
      const block = section.blocks[i];
      if (block.kind === 'question') {
        renderQuestion(doc, block);
      } else if (block.kind === 'note') {
        para(doc, block.text, {
          size: 9,
          color: COLOR.muted,
          indent: block.indent ? INDENT : 0,
          gap: 0.6,
        });
      } else {
        const h =
          measure(doc, block.title, 'main-bold', 11, contentWidth(doc)) +
          (block.note
            ? measure(doc, block.note, 'main', 8.5, contentWidth(doc))
            : 0);
        ensureSpace(doc, h + 50);
        doc.moveDown(0.2);
        para(doc, block.title, { font: 'main-bold', size: 11 });
        if (block.note) {
          para(doc, block.note, { size: 8.5, color: COLOR.muted });
        }
        doc.moveDown(0.4);
      }
    }
  }

  renderSectionTitle(doc, 'Файлы анкеты', 20);
  if (generalFiles.length === 0) {
    para(doc, 'Файлы не приложены', { size: 10, color: COLOR.light });
  } else {
    for (const name of generalFiles) {
      para(doc, `•  ${name}`, { size: 10, gap: 0.15 });
    }
  }

  return toBuffer(doc);
}

interface Column {
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

const CELL_PAD = 4;

function renderTable(doc: Doc, columns: Column[], rows: string[][]) {
  const left = doc.page.margins.left;

  const rowHeight = (cells: string[], font: string) =>
    Math.max(
      ...cells.map((c, i) =>
        measure(doc, c, font, 8.5, columns[i].width - CELL_PAD * 2),
      ),
    ) +
    CELL_PAD * 2;

  const drawRow = (cells: string[], font: string, header: boolean) => {
    const height = rowHeight(cells, font);
    const y = doc.y;
    let x = left;
    if (header) {
      doc
        .rect(
          left,
          y,
          columns.reduce((s, c) => s + c.width, 0),
          height,
        )
        .fill(COLOR.fill);
    }
    cells.forEach((cell, i) => {
      const col = columns[i];
      doc.rect(x, y, col.width, height).lineWidth(0.5).stroke(COLOR.border);
      doc
        .font(font)
        .fontSize(8.5)
        .fillColor(COLOR.text)
        .text(cell, x + CELL_PAD, y + CELL_PAD, {
          width: col.width - CELL_PAD * 2,
          align: col.align ?? 'left',
        });
      x += col.width;
    });
    doc.y = y + height;
  };

  const headerCells = columns.map((c) => c.title);
  const headerHeight = rowHeight(headerCells, 'main-bold');

  ensureSpace(doc, headerHeight + (rows[0] ? rowHeight(rows[0], 'main') : 0));
  drawRow(headerCells, 'main-bold', true);

  for (const row of rows) {
    const height = rowHeight(row, 'main');
    if (doc.y + height > pageBottom(doc)) {
      doc.addPage();
      drawRow(headerCells, 'main-bold', true);
    }
    drawRow(row, 'main', false);
  }
  doc.x = left;
  doc.moveDown(0.8);
}

function optionLabel(key: RequirementKey, value: number | null | undefined) {
  if (value === null || value === undefined) return null;
  const type = REQUIREMENT_TYPES.find((t) => t.key === key);
  return type?.options.find((o) => o.value === value)?.label ?? null;
}

export async function renderMaturityPdf(
  input: MaturityPdfInput,
): Promise<Buffer> {
  const title = 'Оценка уровня зрелости по методике ФСТЭК России от 07.08.2026';
  const doc = createDoc(title);
  const { result } = input;

  renderTitle(doc, title);
  renderHeader(doc, input.header);

  renderSectionTitle(doc, 'Результат оценки', 40);
  const overall =
    result.overall === null
      ? 'не рассчитан (нет применимых направлений)'
      : `${formatNumber(result.overall)} — ${result.overallLevelName ?? ''}`;
  para(doc, `Уровень зрелости (Узи): ${overall}`, {
    font: 'main-bold',
    size: 11,
  });
  if (result.overallLevelDescription) {
    para(doc, result.overallLevelDescription, {
      size: 9,
      color: COLOR.muted,
    });
  }
  doc.moveDown(0.3);
  para(
    doc,
    `Целевой уровень: ${result.targetLevel} — ${result.targetLevelName}` +
      (result.objectCategoryLabel
        ? ` (${result.objectCategoryLabel})`
        : ' (тип систем не указан)'),
    { size: 10 },
  );
  para(
    doc,
    `Достигли цели: ${result.applicableCount - result.belowTargetCount} из ${result.applicableCount}`,
    { size: 10, gap: 0.6 },
  );

  if (input.comment?.trim()) {
    renderTextBlock(doc, 'Комментарий сотрудника', input.comment.trim());
  }

  const applicable = result.directions.filter((d) => !d.notApplicable);
  const notApplicable = result.directions.filter((d) => d.notApplicable);

  // Таблица направлений
  renderSectionTitle(doc, 'Направления', 60);
  if (applicable.length === 0) {
    para(doc, 'Применимых направлений нет', { color: COLOR.light, gap: 0.6 });
  } else {
    renderTable(
      doc,
      [
        { title: '№', width: 24, align: 'center' },
        { title: 'Направление', width: 170 },
        { title: 'P', width: 42, align: 'center' },
        { title: 'Уровень', width: 82 },
        { title: 'Цель', width: 50, align: 'center' },
        { title: 'Недостатки', width: 127 },
      ],
      applicable.map((d) => [
        String(d.direction),
        d.title,
        formatP(d.p),
        d.level === null ? '—' : `${d.level} — ${d.levelName ?? ''}`,
        d.meetsTarget ? 'Да' : 'Нет',
        d.gapTitles.length ? d.gapTitles.join(', ') : '—',
      ]),
    );
  }

  for (const d of applicable) {
    const values = input.values[d.direction] ?? {};
    renderSectionTitle(doc, `${d.direction}. ${d.title}`, 50);

    for (const key of REQUIREMENT_KEYS) {
      const type = REQUIREMENT_TYPES.find((t) => t.key === key)!;
      const value = values[key];
      const label = optionLabel(key, value);
      const heading = `${type.title} (a = ${formatNumber(value ?? null)})`;

      const width = contentWidth(doc) - ANSWER_INDENT;
      const answerHeight = Math.min(
        measure(doc, label ?? 'Нет ответа', 'main', 9.5, width),
        measure(doc, 'Ж', 'main', 9.5, width) * KEEP_ANSWER_LINES,
      );
      ensureSpace(
        doc,
        measure(doc, heading, 'main-bold', 9.5, contentWidth(doc)) +
          answerHeight +
          4,
      );
      para(doc, heading, { font: 'main-bold', size: 9.5 });
      para(doc, label ?? 'Нет ответа', {
        size: 9.5,
        indent: ANSWER_INDENT,
        color: label ? COLOR.text : COLOR.light,
        gap: 0.35,
      });
    }

    const comment = d.comment?.trim();
    ensureSpace(doc, 30);
    para(doc, 'Комментарий подрядчика:', {
      font: 'main-bold',
      size: 9,
      color: COLOR.muted,
    });
    para(doc, comment || 'Нет комментария', {
      size: 9.5,
      indent: ANSWER_INDENT,
      color: comment ? COLOR.text : COLOR.light,
      gap: 0.6,
    });
  }

  // Неприменимые направления
  if (notApplicable.length > 0) {
    renderSectionTitle(doc, 'Неприменимые направления', 30);
    for (const d of notApplicable) {
      const reason = d.comment?.trim() || 'причина не указана';
      ensureSpace(doc, 26);
      para(doc, `${d.direction}. ${d.title}`, { font: 'main-bold', size: 10 });
      para(doc, `Причина: ${reason}`, {
        size: 9.5,
        indent: ANSWER_INDENT,
        color: COLOR.muted,
        gap: 0.4,
      });
    }
  }

  return toBuffer(doc);
}
