import React from 'react';
import { CheckCircle, FileText, ArrowRight, Home } from 'lucide-react';

interface Props {
  applicationId: string;
  onReset: () => void;
}

export const ApplicationSuccess: React.FC<Props> = ({
  applicationId,
  onReset,
}) => {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center animate-fadeIn">
      <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
        <CheckCircle className="w-10 h-10" />
      </div>

      <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
        Application Submitted Successfully
      </span>

      <h1 className="text-3xl font-extrabold text-slate-900 mt-4 mb-2">
        Thank You for Applying!
      </h1>
      <p className="text-sm text-slate-600 mb-8 max-w-md mx-auto">
        Your Bajaj Auto Loan application has been successfully saved to our database and submitted to the underwriting desk.
      </p>

      {/* Reference Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-8 text-left">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
          Your Application Reference ID
        </div>
        <div className="text-2xl font-mono font-bold text-bajaj-blue flex items-center justify-between">
          <span>{applicationId}</span>
          <span className="text-xs font-sans font-medium px-2.5 py-1 bg-blue-50 text-bajaj-blue rounded-full border border-blue-200">
            Status: New Underwriting
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-4 pt-4 border-t border-slate-100">
          Our credit officer will review your application shortly. You will receive an SMS confirmation on your registered mobile number once the eligibility check is complete.
        </p>
      </div>

      <div className="flex items-center justify-center">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-bajaj-blue hover:bg-bajaj-dark text-white text-sm font-semibold transition active:scale-95 shadow-sm"
        >
          Submit Another Application
        </button>
      </div>
    </div>
  );
};
