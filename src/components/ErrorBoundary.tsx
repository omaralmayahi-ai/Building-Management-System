import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  declare state: State;
  declare props: Props;
  declare setState: React.Component<Props, State>['setState'];

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-card text-slate-900 flex items-center justify-center p-6 text-right dir-rtl font-sans">
          <div className="max-w-md w-full bg-card border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 bg-brand-50 border border-brand-200 text-brand-700 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-black text-slate-800">حدث خطأ غير متوقع في التطبيق</h1>
              <p className="text-xs text-slate-500 leading-relaxed">
                تم التعامل مع الخطأ بنجاح لحماية بيانات الجلسة والنظام. يرجى إعادة تحميل الصفحة لمتابعة العمل بشكل طبيعي.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-card border border-slate-200 rounded-xl text-[11px] font-mono text-brand-700 truncate text-left dir-ltr">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-5 bg-brand-700 hover:bg-brand-800 text-on-brand font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-lg "
            >
              <RefreshCw className="w-4 h-4" />
              <span>إعادة تحميل التطبيق</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
