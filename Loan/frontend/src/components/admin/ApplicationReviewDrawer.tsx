import React, { useState } from 'react';
import { Application, EligibilityStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { applicationsApi } from '../../services/api';
import {
  X,
  Lock,
  Unlock,
  CheckCircle,
  AlertTriangle,
  User,
  Home,
  Briefcase,
  IndianRupee,
  Truck,
  Landmark,
  Save,
  Clock,
  ShieldCheck,
  FileText,
  Download,
  ExternalLink,
} from 'lucide-react';

interface Props {
  application: Application | null;
  onClose: () => void;
  onUpdated: (app: Application) => void;
}

export const ApplicationReviewDrawer: React.FC<Props> = ({
  application,
  onClose,
  onUpdated,
}) => {
  const { admin } = useAuth();
  const [eligibility, setEligibility] = useState<EligibilityStatus>(
    application?.eligibility && application.eligibility !== 'PENDING'
      ? application.eligibility
      : ('' as any),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!application) return null;

  const data = (application.formData || {}) as any;
  const personal = data.personal || {};
  const kyc = data.kyc || {};
  const address = data.address || {};
  const occ = data.occupation || {};
  const bank = data.bank || {};

  // Lock status evaluation
  const isCompleted = application.status === 'COMPLETED';
  const isLockedByOther =
    !isCompleted &&
    application.lockedByAdminId &&
    application.lockedByAdminId !== admin?.id;
  const isLockedByMe =
    !isCompleted &&
    application.lockedByAdminId &&
    application.lockedByAdminId === admin?.id;

  const handleSaveEligibility = async () => {
    if (!eligibility || eligibility === ('PENDING' as any)) {
      setErrorMessage('Please select either "Yes" or "No" for eligibility');
      return;
    }

    if (!admin) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      const updated = await applicationsApi.saveEligibility(
        application.id,
        eligibility as 'YES' | 'NO',
        admin.id,
        admin.name,
      );
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || 'Failed to save eligibility decision.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseAndUnlock = async () => {
    if (admin && !isCompleted) {
      try {
        await applicationsApi.releaseLock(application.id, admin.id);
      } catch (e) {
        console.error('Failed to release lock on close', e);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-fadeIn">
      <div className="w-full max-w-3xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-bajaj-blue flex items-center justify-center font-bold">
              {application.applicationId.slice(-3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {application.applicantFullName}
                </h2>
                <span className="text-xs font-mono font-semibold text-bajaj-blue bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {application.applicationId}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Applied on {new Date(application.createdAt).toLocaleString()} &bull; Phone: +91 {application.mobileNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAndUnlock}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lock Warning or Status Banner */}
        {isLockedByOther && (
          <div className="p-4 bg-amber-500 text-white flex items-center gap-3 shadow-md">
            <Lock className="w-5 h-5 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-sm block">
                another admin is using
              </span>
              <span>
                Currently being reviewed by <strong>{application.lockedByAdminName}</strong>. Editing is locked to prevent conflicts.
              </span>
            </div>
          </div>
        )}

        {isLockedByMe && !isCompleted && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-800 flex items-center justify-between text-xs px-6">
            <div className="flex items-center gap-2">
              <Unlock className="w-4 h-4 text-emerald-600" />
              <span>
                You have exclusive review lock on this application. Other admins see: <em>"another admin is using"</em>.
              </span>
            </div>
            <span className="font-semibold text-emerald-700">Active Review Mode</span>
          </div>
        )}

        {isCompleted && (
          <div className="p-3 bg-slate-100 border-b border-slate-200 text-slate-700 flex items-center justify-between text-xs px-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>
                Application Completed by <strong>{application.completedByAdminName || 'Admin'}</strong> on{' '}
                {application.completedAt ? new Date(application.completedAt).toLocaleString() : 'N/A'}
              </span>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase ${
                application.eligibility === 'YES'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              Eligibility: {application.eligibility}
            </span>
          </div>
        )}

        {/* Drawer Body (Read-only application details) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Applicant & KYC */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-bajaj-blue" /> Personal & KYC Verification
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Full Legal Name</span>
                <span className="font-semibold text-slate-900">{personal.applicant_full_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Date of Birth</span>
                <span className="font-medium text-slate-900">{personal.date_of_birth || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gender</span>
                <span className="font-medium text-slate-900">{personal.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Father's Name</span>
                <span className="font-medium text-slate-900">{personal.father_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">PAN Number</span>
                <span className="font-mono font-bold text-bajaj-blue">{kyc.pan_number || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Aadhaar (Last 4)</span>
                <span className="font-mono font-medium text-slate-900">
                  {kyc.aadhaar_number ? `XXXX-XXXX-${kyc.aadhaar_number.slice(-4)}` : 'N/A'}
                </span>
              </div>
            </div>

            {/* Attached KYC Documents */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-700 block mb-2">
                Attached Identity Documents:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'PAN Card', doc: kyc.pan_document, required: true },
                  { label: 'Aadhaar Card', doc: kyc.aadhaar_document, required: true },
                  { label: 'Driving Licence', doc: kyc.driving_licence_document, required: false },
                  { label: 'Voter ID', doc: kyc.voter_id_document, required: false },
                ].map(({ label, doc, required }) => (
                  <div
                    key={label}
                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 ${
                      doc
                        ? 'bg-blue-50/40 border-blue-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText
                        className={`w-4 h-4 shrink-0 ${
                          doc ? 'text-bajaj-blue' : 'text-slate-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <span className="font-medium text-slate-800 block text-[11px] truncate">
                          {label} {required && <span className="text-red-500">*</span>}
                        </span>
                        {doc ? (
                          <span className="text-[10px] text-slate-500 block truncate">
                            {doc.fileName} ({doc.fileSize})
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Not uploaded
                          </span>
                        )}
                      </div>
                    </div>

                    {doc && (
                      <a
                        href={doc.dataUrl}
                        download={doc.fileName}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-300 hover:border-bajaj-blue hover:text-bajaj-blue text-[11px] font-semibold text-slate-700 rounded transition shrink-0"
                        title="Download / View document"
                      >
                        <Download className="w-3 h-3" /> View
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. Residence Address */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Home className="w-4 h-4 text-indigo-600" /> Residential Address
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="col-span-2">
                <span className="text-slate-400 block">Address Line</span>
                <span className="font-medium text-slate-900">
                  {address.door_flat}, {address.street}, {address.locality}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">City & District</span>
                <span className="font-medium text-slate-900">{address.city}, {address.district}</span>
              </div>
              <div>
                <span className="text-slate-400 block">State & PIN</span>
                <span className="font-mono font-medium text-slate-900">{address.state} - {address.pincode}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Residence Type</span>
                <span className="font-medium text-slate-900">{address.address_type} ({address.years_at_address || 0} yrs)</span>
              </div>
            </div>
          </div>

          {/* 3. Occupation & Financials */}
          <div className="border border-slate-200 rounded-xl p-4 bg-white">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-emerald-600" /> Occupation & Income
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Employment Type</span>
                <span className="font-semibold text-slate-900">{occ.employment_type}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Gross Monthly Income</span>
                <span className="font-semibold text-slate-900">₹{occ.monthly_gross_income?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Net Monthly Income</span>
                <span className="font-bold text-emerald-700">₹{occ.monthly_net_income?.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Existing Loans</span>
                <span className="font-medium text-slate-900">
                  {occ.existing_loan === 'Yes' ? `Yes (EMI ₹${occ.existing_emi})` : 'No'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Disbursal Bank</span>
                <span className="font-medium text-slate-900">{bank.bank_name}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Bank IFSC</span>
                <span className="font-mono font-medium text-slate-900">{bank.ifsc}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer: Admin Decision Action */}
        <div className="p-6 border-t border-slate-200 bg-slate-50">
          {isCompleted ? (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                This application has already been processed and moved to Completed.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                Close Drawer
              </button>
            </div>
          ) : isLockedByOther ? (
            <div className="flex items-center justify-between">
              <div className="text-xs text-amber-800 font-semibold flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-amber-600" />
                another admin is using ({application.lockedByAdminName}). Editing disabled.
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* The single editable field: Eligibility dropdown */}
                <div className="flex-1 max-w-sm">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Eligibility Decision <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={eligibility}
                    onChange={(e) => setEligibility(e.target.value as EligibilityStatus)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                  >
                    <option value="">-- Select Eligibility --</option>
                    <option value="YES">Yes - Approved / Eligible</option>
                    <option value="NO">No - Ineligible / Rejected</option>
                  </select>
                </div>

                {/* Save button */}
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handleSaveEligibility}
                    disabled={isSaving || !eligibility}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-md shadow-emerald-900/10 transition active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving ? (
                      'Saving Decision...'
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
