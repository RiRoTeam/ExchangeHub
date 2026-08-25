import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { useRouter } from "./RouterProvider";

type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
  replace?: boolean;
  children: ReactNode;
};

function isModifiedEvent(event: MouseEvent<HTMLAnchorElement>) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

/**
 * Внутренняя ссылка: настоящий <a href>, чтобы работали «открыть в новой
 * вкладке», копирование адреса и предпросмотр в статусной строке, но обычный
 * клик перехватывается роутером и не перезагружает страницу.
 */
export function AppLink({ to, replace, children, onClick, ...rest }: AppLinkProps) {
  const { navigate } = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    // Левая кнопка без модификаторов — навигация внутри приложения.
    if (event.defaultPrevented || event.button !== 0 || isModifiedEvent(event)) {
      return;
    }

    event.preventDefault();
    navigate(to, { replace });
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  );
}
