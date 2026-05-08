import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Bonyeza kwenye mandhari nyuma ya dirisha */
  onBackdropClick?: () => void;
  /** mfano: max-w-md, max-w-2xl, max-w-4xl */
  maxWidthClass?: string;
  /** Ongeza darasa kwenye layer ya nje, mf. print:hidden */
  extraBackdropClassName?: string;
  /**
   * Ukichagua, inabadilisha darasa la mandhari nzima (mf. z-[70], rangi nyingine).
   * Tumia unapohitaji mandhari tofauti kabisa kuliko chaguo-msingi.
   */
  overlayClassName?: string;
};

/**
 * Mandhari ya modal inayoruhusu skrôl ya wima kwa fomu ndefu (juu ↔ chini).
 */
export function ModalScrollLayer({
  children,
  onBackdropClick,
  maxWidthClass = "max-w-2xl",
  extraBackdropClassName = "",
  overlayClassName,
}: Props) {
  const outerClass =
    overlayClassName?.trim() ||
    `fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/45 px-2 py-4 backdrop-blur-sm sm:px-4 sm:py-10 ${extraBackdropClassName}`.trim();

  return (
    <div className={outerClass} onClick={onBackdropClick} role="presentation">
      <div className="flex min-h-full items-center justify-center">
        <div className={`relative w-full ${maxWidthClass} py-2`} onClick={(e) => e.stopPropagation()}>
          <div className="max-h-[min(92vh,calc(100dvh-2rem))] overflow-y-auto overscroll-y-contain [scrollbar-gutter:stable] sm:max-h-[min(88vh,calc(100dvh-5rem))]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
