/**
 * Копирование текста в буфер обмена.
 *
 * navigator.clipboard доступен только в "безопасном контексте" (https:// или
 * localhost). На VPS сайт открывается по http://, там navigator.clipboard ===
 * undefined, поэтому нужен резервный путь через устаревший
 * document.execCommand('copy') — он работает и без HTTPS.
 *
 * @returns true, если текст удалось скопировать.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API есть, но браузер отказал (нет разрешения, документ не
      // в фокусе) — пробуем резервный способ ниже.
    }
  }
  return legacyCopy(text);
}

// Резервный способ: временный <textarea> вне экрана + execCommand('copy').
function legacyCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  // Вне видимой области, но не display:none — иначе выделение не сработает.
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);

  const previouslyFocused = document.activeElement as HTMLElement | null;

  try {
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length); // нужно для iOS Safari
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
    previouslyFocused?.focus?.();
  }
}
