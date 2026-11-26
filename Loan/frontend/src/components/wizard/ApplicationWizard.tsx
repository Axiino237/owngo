import React, { useState, useEffect } from 'react';
import { FullApplicationForm } from '../../types';
import {
  INITIAL_FORM_STATE,
  saveDraft,
  loadDraft,
  clearDraft,
} from './formInitialState';
import { Step1PersonalKYC } from './Step1PersonalKYC';
import { Step2Address } from './Step2Address';
import { Step3Financials } from './Step3Financials';
import { Step5ReviewSubmit } from './Step5ReviewSubmit';
import { applicationsApi } from '../../services/api';
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  Clock,
  Check,
  AlertCircle,
} from 'lucide-react';

interface Props {
  onSuccess: (applicationId: string) => void;
}

const STEP_TITLES = [
  { step: 1, title: 'Personal & KYC', desc: 'Identity & Details' },
  { step: 2, title: 'Address & Residence', desc: 'Current & Permanent' },
  { step: 3, title: 'Income & Banking', desc: 'Earnings & Bank' },
  { step: 4, title: 'Review & Submit', desc: 'Summary & Consent' },
];

export const ApplicationWizard: React.FC<Props> = ({ onSuccess }) => {
  const [formData, setFormData] = useState<FullApplicationForm>(INITIAL_FORM_STATE);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  // Check for saved draft on initial load
  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.data?.personal?.applicant_full_name) {
      setHasDraft(true);
    }
  }, []);

  const handleResumeDraft = () => {
    const draft = loadDraft();
    if (draft) {
      setFormData(draft.data);
      setCurrentStep(draft.step || 1);
      setHasDraft(false);
    }
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setFormData(INITIAL_FORM_STATE);
    setHasDraft(false);
  };

  // Auto-save on every state change or step change
  const handleFormChange = (updater: (prev: FullApplicationForm) => FullApplicationForm) => {
    setFormData((prev) => {
      const next = updater(prev);
      saveDraft(next, currentStep);
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      return next;
    });
  };

  // Step Validation Logic
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (currentStep === 1) {
      const p = formData.personal;
      const k = formData.kyc;
      if (!p.applicant_full_name?.trim()) newErrors.applicant_full_name = 'Full name is required';
      if (!p.date_of_birth) {
        newErrors.date_of_birth = 'Date of birth is required';
      } else {
        const dob = new Date(p.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (isNaN(dob.getTime()) || age <= 18) {
          newErrors.date_of_birth = 'Applicant must be older than 18 years of age to apply';
        }
      }
      if (!p.father_name?.trim()) newErrors.father_name = "Father's name is required";
      if (!p.mobile_number || p.mobile_number.length !== 10) {
        newErrors.mobile_number = 'Valid 10-digit mobile number required';
      }
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
      if (!k.pan_number || !panRegex.test(k.pan_number)) {
        newErrors.pan_number = 'Valid PAN required (e.g. ABCDE1234F)';
      }
      if (!k.aadhaar_number || k.aadhaar_number.length !== 12) {
        newErrors.aadhaar_number = 'Valid 12-digit Aadhaar required';
      }
      if (!k.pan_document) {
        newErrors.pan_document = 'Please upload your PAN card document';
      }
      if (!k.aadhaar_document) {
        newErrors.aadhaar_document = 'Please upload your Aadhaar card document';
      }
    } else if (currentStep === 2) {
      const a = formData.address;
      if (!a.door_flat?.trim()) newErrors.door_flat = 'Flat / House number is required';
      if (!a.street?.trim()) newErrors.street = 'Street name is required';
      if (!a.locality?.trim()) newErrors.locality = 'Locality / Area is required';
      if (!a.city?.trim()) newErrors.city = 'City is required';
      if (!a.district?.trim()) newErrors.district = 'District is required';
      if (!a.pincode || a.pincode.length !== 6) newErrors.pincode = '6-digit PIN code required';
    } else if (currentStep === 3) {
      const o = formData.occupation;
      const b = formData.bank;
      if (!o.occupation?.trim()) newErrors.occupation = 'Occupation is required';
      if (!o.monthly_gross_income || o.monthly_gross_income <= 0) {
        newErrors.monthly_gross_income = 'Monthly gross income must be greater than 0';
      }
      if (!o.monthly_net_income || o.monthly_net_income <= 0) {
        newErrors.monthly_net_income = 'Monthly net income must be greater than 0';
      }
      if (!b.account_holder?.trim()) newErrors.account_holder = 'Account holder name is required';
      if (!b.account_number) newErrors.account_number = 'Account number is required';
      if (b.account_number !== b.confirm_account_number) {
        newErrors.confirm_account_number = 'Account numbers do not match';
      }
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!b.ifsc || !ifscRegex.test(b.ifsc)) {
        newErrors.ifsc = 'Valid 11-character IFSC required (e.g. SBIN0004128)';
      }
      if (o.existing_loan === 'Yes' && (!o.existing_emi || o.existing_emi <= 0)) {
        newErrors.existing_emi = 'Please enter your current monthly EMI amount';
      }
    } else if (currentStep === 4) {
      const c = formData.consent;
      if (!c.credit_bureau_consent) {
        newErrors.credit_bureau_consent = 'Credit bureau consent is required to evaluate loan';
      }
      if (!c.kyc_consent) {
        newErrors.kyc_consent = 'KYC verification consent is required to proceed';
      }
      if (!c.loan_declaration) {
        newErrors.loan_declaration = 'Please confirm the loan application declaration';
      }
      if (!c.privacy_acceptance) {
        newErrors.privacy_acceptance = 'Privacy policy and terms acceptance is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      saveDraft(formData, nextStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      saveDraft(formData, prevStep);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleFinalSubmit = async () => {
    if (!validateCurrentStep()) return;

    setIsSubmitting(true);
    setSubmissionError('');
    try {
      const res = await applicationsApi.create(formData);
      clearDraft();
      onSuccess(res.applicationId);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Submission failed';
      setSubmissionError(msg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Resume Incomplete Application Banner */}
      {hasDraft && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                Incomplete Application Found
              </p>
              <p className="text-xs text-amber-700">
                You have an unsaved draft from a previous session. Would you like to resume where you left off?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResumeDraft}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
            >
              Resume Draft
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-50 rounded-lg text-xs font-medium transition"
            >
              Start Fresh
            </button>
          </div>
        </div>
      )}

      {/* Submission Error Banner */}
      {submissionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 shadow-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-800">
            <span className="font-bold text-sm block mb-0.5">Submission Blocked</span>
            <span>{submissionError}</span>
          </div>
        </div>
      )}

      {/* Form Title Header */}
      <div className="mb-8">
        <span className="text-xs font-bold tracking-wider uppercase text-bajaj-blue bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
          Bajaj Auto Finance Limited
        </span>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
          Commercial 3-Wheeler Loan Application
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Complete the 4 steps below for instant digital loan eligibility assessment
        </p>
      </div>

      {/* Progress Indicator (Step X of 5) */}
      <div className="mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-800">
            Step {currentStep} of 4: <span className="text-bajaj-blue">{STEP_TITLES[currentStep - 1].title}</span>
          </span>
          <span className="text-xs font-medium text-slate-500">
            {Math.round((currentStep / 4) * 100)}% Completed
          </span>
        </div>

        {/* Progress bar line */}
        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-bajaj-blue h-full transition-all duration-300 rounded-full"
            style={{ width: `${(currentStep / 4) * 100}%` }}
          />
        </div>

        {/* Responsive Step Pills */}
        <div className="grid grid-cols-4 gap-2 mt-4 text-center">
          {STEP_TITLES.map((s) => {
            const isCompleted = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                className={`py-2 px-1 rounded-lg text-xs transition ${isCurrent
                    ? 'bg-blue-50 text-bajaj-blue font-bold border border-blue-200'
                    : isCompleted
                      ? 'text-emerald-700 font-medium'
                      : 'text-slate-400'
                  }`}
              >
                <div className="flex items-center justify-center gap-1">
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center">
                      {s.step}
                    </span>
                  )}
                  <span className="hidden sm:inline truncate">{s.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Step Content */}
      <div className="mb-8">
        {currentStep === 1 && (
          <Step1PersonalKYC formData={formData} onChange={handleFormChange} errors={errors} />
        )}
        {currentStep === 2 && (
          <Step2Address formData={formData} onChange={handleFormChange} errors={errors} />
        )}
        {currentStep === 3 && (
          <Step3Financials formData={formData} onChange={handleFormChange} errors={errors} />
        )}
        {currentStep === 4 && (
          <Step5ReviewSubmit
            formData={formData}
            onChange={handleFormChange}
            goToStep={(step) => setCurrentStep(step)}
            errors={errors}
          />
        )}
      </div>

      {/* Bottom Sticky Action Bar: Back & Continue Buttons */}
      <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between gap-4">
        <div>
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition active:scale-95 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <div className="text-xs text-slate-400 flex items-center gap-1.5 pl-2">
              <Clock className="w-3.5 h-3.5" />
              Auto-saving draft locally
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-bajaj-blue hover:bg-bajaj-dark text-white text-sm font-semibold shadow-md shadow-blue-900/10 transition active:scale-95"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-900/10 transition active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting Application...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
