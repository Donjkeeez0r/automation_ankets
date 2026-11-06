const SITE_URL = 'https://www.rt.ru';
const PDN_POLICY_URL = 'https://msk.rt.ru/sites/default/files/doc/pdn.pdf';

interface FooterProps {
  // Горизонтальные отступы снаружи контейнера — те же, что у контента страницы
  className?: string;
  // Ширина и выравнивание контейнера — те же, что у контента страницы
  containerClassName?: string;
}

export default function Footer({ className = 'px-4', containerClassName = '' }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className={`mt-auto w-full bg-[#f7f7f7] border-t border-gray-200 ${className}`}>
      <div
        className={`py-6 flex flex-col gap-4 sm:flex-row sm:gap-16 text-[13px] leading-5 text-gray-500 ${containerClassName}`}
      >
        <div>
          <p>© {year} ПАО «Ростелеком». 18+</p>
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            www.rt.ru
          </a>
        </div>
        <a
          href={PDN_POLICY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-700 no-underline hover:underline break-words"
        >
          Политика обработки персональных данных
        </a>
      </div>
    </footer>
  );
}
