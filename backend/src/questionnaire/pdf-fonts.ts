import { join } from 'path';

// DejaVuSans — шрифт с кириллицей для всех PDF, которые формирует бэкенд
export const FONT_PATH = join(process.cwd(), 'assets/fonts/DejaVuSans.ttf');
export const FONT_BOLD_PATH = join(
  process.cwd(),
  'assets/fonts/DejaVuSans-Bold.ttf',
);
