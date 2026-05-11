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
 * Modal overlay with vertical scroll for tall content.
 * Small screens: aligns from top + respects safe-area and dynamic viewport (`dvh`).
 * `sm+`: centers vertically when space allows.
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
    `fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-black/45 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-10 ${extraBackdropClassName}`.trim();

  return (
    <div className={outerClass} onClick={onBackdropClick} role="presentation">
      <div className="flex min-h-[100dvh] w-full flex-col items-stretch justify-start pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:min-h-full sm:items-center sm:justify-center sm:py-10">
        <div
          className={`relative mx-auto w-full min-w-0 ${maxWidthClass} py-1 sm:py-2`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1.25rem))] overflow-y-auto overscroll-y-contain leading-relaxed [-webkit-overflow-scrolling:touch] [scrollbar-gutter:stable] sm:max-h-[min(90vh,calc(100dvh-5rem))]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
