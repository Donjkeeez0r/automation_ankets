import { useId, useState, type ReactNode } from 'react';

type Placement = 'top' | 'bottom';

type TooltipProps = {
  /** Текст подсказки. Если пустой — обёртка ничего не показывает. */
  text: string;
  /** Элемент (обычно кнопка), к которому привязана подсказка. */
  children: ReactNode;
  /** С какой стороны показывать подсказку. По умолчанию — сверху. */
  placement?: Placement;
  className?: string;
};

/**
 * Простая всплывающая подсказка: показывается при наведении мыши и при фокусе
 * с клавиатуры. Скрывается по Esc, чтобы не перекрывать интерфейс.
 */
export default function Tooltip({
  text,
  children,
  placement = 'top',
  className = '',
}: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();

  if (!text) return <>{children}</>;

  const position =
    placement === 'top'
      ? 'bottom-full mb-2'
      : 'top-full mt-2';

  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={`pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 ${position}
          w-max max-w-[260px] whitespace-normal rounded-lg bg-gray-900/95 px-3 py-2
          text-xs font-normal leading-snug text-white shadow-lg`}
      >
        {text}
      </span>
    </span>
  );
}
