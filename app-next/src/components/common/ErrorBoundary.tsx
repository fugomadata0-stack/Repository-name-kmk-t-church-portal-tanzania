import { Component, type ErrorInfo, type ReactNode } from "react";

/** Ujumbe wa mtumiaji — si maelezo ya kiufundi (hayawekwi kwenye UI ya uzalishaji). */
export const GLOBAL_ERROR_BOUNDARY_MESSAGE_SW =
  "Samahani, mfumo umepata changamoto ndogo. Tafadhali refresh ukurasa.";

interface Props {
  children: ReactNode;
  /** Kitambulisho cha sehemu (kwa ufuatiliaji na ujumbe). */
  sectionLabel?: string;
}

interface State {
  hasError: boolean;
  /** Maelezo ya hitilafu — kwa MODE ya maendelezo tu (console daima ina log kamili). */
  devDetail: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, devDetail: "" };

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true, devDetail: "" };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    const label = this.props.sectionLabel?.trim();
    console.error(label ? `[ErrorBoundary:${label}]` : "[ErrorBoundary]", err, info.componentStack);
    if (import.meta.env.DEV) {
      this.setState({ devDetail: err?.message || String(err) });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, devDetail: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-12 text-center"
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-lg font-bold text-[#0f1e46]">
            Changamoto ya mfumo{this.props.sectionLabel ? ` — ${this.props.sectionLabel}` : ""}
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-slate-700">{GLOBAL_ERROR_BOUNDARY_MESSAGE_SW}</p>
          {import.meta.env.DEV && this.state.devDetail ? (
            <pre className="max-h-40 max-w-lg overflow-auto rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-xs text-rose-900">
              {this.state.devDetail}
            </pre>
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
              onClick={this.handleRetry}
            >
              Jaribu tena
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-950"
              onClick={() => window.location.reload()}
            >
              Refresh ukurasa
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
