import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, ExternalLink, Copy, Check, QrCode, Shield, ArrowRight } from 'lucide-react';

interface Props {
  onNavigateToForm: () => void;
  onNavigateToAdmin: () => void;
}

export const QRScreen: React.FC<Props> = ({ onNavigateToForm, onNavigateToAdmin }) => {
  const [formUrl, setFormUrl] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Construct the URL pointing to the customer form
    const currentOrigin = window.location.origin;
    setFormUrl(`${currentOrigin}?screen=form`);
  }, []);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(formUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="max-w-xl w-full bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-bajaj-dark via-bajaj-blue to-bajaj-accent p-8 text-white text-center relative">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase mb-3 text-blue-100 border border-white/15">
            <QrCode className="w-3.5 h-3.5" /> Instant Customer Onboarding
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Bajaj Auto Loan
          </h1>
          <p className="text-blue-100 text-sm mt-1 max-w-sm mx-auto">
            Scan QR code with your mobile camera to launch the digital financing form
          </p>
        </div>

        {/* QR Code Presentation Box */}
        <div className="p-8 text-center flex flex-col items-center">
          <div className="p-5 bg-white rounded-2xl border-2 border-slate-200 shadow-inner inline-block hover:border-bajaj-blue transition duration-300">
            {formUrl && (
              <QRCodeSVG
                value={formUrl}
                size={220}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {/* Instructions */}
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium mt-4">
            <Smartphone className="w-4 h-4 text-bajaj-blue" />
            <span>Point camera &bull; Tap popup link &bull; Complete 5-step form</span>
          </div>

          {/* Direct Actions */}
          <div className="w-full mt-6 space-y-3">
            <button
              type="button"
              onClick={onNavigateToForm}
              className="w-full py-3 px-4 rounded-xl bg-bajaj-blue hover:bg-bajaj-dark text-white font-semibold text-sm flex items-center justify-center gap-2 transition active:scale-98 shadow-md shadow-blue-900/10"
            >
              Open Customer Form On This Screen <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Link Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  Copy Form URL to Share / Test on Mobile
                </>
              )}
            </button>
          </div>

          {/* Quick Info Badges */}
          <div className="w-full grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-slate-100 text-center">
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Turnaround</span>
              <span className="text-xs font-bold text-slate-800">5 Mins Assessment</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Down Payment</span>
              <span className="text-xs font-bold text-slate-800">Low as 20%</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Interest Rate</span>
              <span className="text-xs font-bold text-emerald-700">Attractive ROI</span>
            </div>
          </div>
        </div>

        {/* Footer Admin Link */}
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Bajaj Auto Credit Officer Desk</span>
          <button
            type="button"
            onClick={onNavigateToAdmin}
            className="text-bajaj-blue font-semibold hover:underline flex items-center gap-1"
          >
            Go to Admin Dashboard &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
