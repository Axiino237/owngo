import React from 'react';
import { FullApplicationForm } from '../../types';
import { CheckCircle2, ShieldCheck, Edit3, AlertCircle } from 'lucide-react';

interface Props {
  formData: FullApplicationForm;
  onChange: (updater: (prev: FullApplicationForm) => FullApplicationForm) => void;
  goToStep: (stepNumber: number) => void;
  errors: Record<string, string>;
}

export const Step5ReviewSubmit: React.FC<Props> = ({
  formData,
  onChange,
  goToStep,
  errors,
}) => {
  const consent = formData.consent;

  const updateConsent = (field: string, value: boolean) => {
    onChange((prev) => ({
      ...prev,
      consent: { ...prev.consent, [field]: value },
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Complete Application Summary Cards */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Application Summary Review</h2>
            <p className="text-sm text-slate-500">
              Please verify all entered information carefully before submitting your loan application
            </p>
          </div>
          <span className="text-xs bg-blue-50 text-bajaj-blue font-semibold px-2.5 py-1 rounded-full border border-blue-200">
            Final Step
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Applicant & Identity */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">1. Personal & KYC Details</h3>
              <button
                type="button"
                onClick={() => goToStep(1)}
                className="text-xs font-semibold text-bajaj-blue hover:text-bajaj-accent flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <dl className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <dt className="text-slate-500">Full Name:</dt>
                <dd className="font-semibold text-slate-900">{formData.personal.applicant_full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Mobile:</dt>
                <dd className="font-semibold text-slate-900">+91 {formData.personal.mobile_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Date of Birth:</dt>
                <dd className="font-medium text-slate-900">{formData.personal.date_of_birth}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Father's Name:</dt>
                <dd className="font-medium text-slate-900">{formData.personal.father_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">PAN Number:</dt>
                <dd className="font-mono font-semibold text-slate-900">{formData.kyc.pan_number}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Aadhaar:</dt>
                <dd className="font-mono text-slate-900">
                  {formData.kyc.aadhaar_number
                    ? `XXXX-XXXX-${formData.kyc.aadhaar_number.slice(-4)}`
                    : 'Not provided'}
                </dd>
              </div>
              <div className="pt-2 border-t border-slate-200 mt-2">
                <dt className="text-slate-500 mb-1">Attached KYC Documents:</dt>
                <dd className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">PAN Card:</span>
                    <span className={formData.kyc.pan_document ? "text-emerald-700 font-medium" : "text-slate-400"}>
                      {formData.kyc.pan_document ? `✓ ${formData.kyc.pan_document.fileName}` : 'Not uploaded'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Aadhaar Card:</span>
                    <span className={formData.kyc.aadhaar_document ? "text-emerald-700 font-medium" : "text-slate-400"}>
                      {formData.kyc.aadhaar_document ? `✓ ${formData.kyc.aadhaar_document.fileName}` : 'Not uploaded'}
                    </span>
                  </div>
                  {formData.kyc.driving_licence_document && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">Driving Licence:</span>
                      <span className="text-emerald-700 font-medium">
                        ✓ {formData.kyc.driving_licence_document.fileName}
                      </span>
                    </div>
                  )}
                  {formData.kyc.voter_id_document && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-600">Voter ID:</span>
                      <span className="text-emerald-700 font-medium">
                        ✓ {formData.kyc.voter_id_document.fileName}
                      </span>
                    </div>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 2: Address */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">2. Residential Address</h3>
              <button
                type="button"
                onClick={() => goToStep(2)}
                className="text-xs font-semibold text-bajaj-blue hover:text-bajaj-accent flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <dl className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <dt className="text-slate-500">Address:</dt>
                <dd className="font-medium text-slate-900 text-right max-w-[200px] truncate">
                  {formData.address.door_flat}, {formData.address.street}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">City / State:</dt>
                <dd className="font-medium text-slate-900">
                  {formData.address.city}, {formData.address.state}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">PIN Code:</dt>
                <dd className="font-mono font-semibold text-slate-900">{formData.address.pincode}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Residence Type:</dt>
                <dd className="font-medium text-slate-900">{formData.address.address_type}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Permanent Same:</dt>
                <dd className="font-medium text-slate-900">
                  {formData.address.permanent_same ? 'Yes' : 'Different Address Provided'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Card 3: Financial & Bank */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">3. Income & Bank Account</h3>
              <button
                type="button"
                onClick={() => goToStep(3)}
                className="text-xs font-semibold text-bajaj-blue hover:text-bajaj-accent flex items-center gap-1"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>
            <dl className="text-xs space-y-1.5 text-slate-600">
              <div className="flex justify-between">
                <dt className="text-slate-500">Employment:</dt>
                <dd className="font-medium text-slate-900">{formData.occupation.employment_type} ({formData.occupation.occupation})</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Gross Income:</dt>
                <dd className="font-semibold text-slate-900">₹{formData.occupation.monthly_gross_income?.toLocaleString('en-IN')}/mo</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Net Income:</dt>
                <dd className="font-semibold text-emerald-700">₹{formData.occupation.monthly_net_income?.toLocaleString('en-IN')}/mo</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Existing Loans:</dt>
                <dd className="font-medium text-slate-900">
                  {formData.occupation.existing_loan === 'Yes'
                    ? `Yes (EMI ₹${formData.occupation.existing_emi?.toLocaleString('en-IN')})`
                    : 'None'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Bank & IFSC:</dt>
                <dd className="font-mono text-slate-900">
                  {formData.bank.bank_name} ({formData.bank.ifsc})
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Consent and Legal Declarations */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">12. Consent & Declarations</h2>
            <p className="text-sm text-slate-500">Mandatory regulatory authorisations per RBI & Bajaj Finance guidelines</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Credit Bureau Consent */}
          <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
            errors.credit_bureau_consent ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="checkbox"
              checked={consent.credit_bureau_consent}
              onChange={(e) => updateConsent('credit_bureau_consent', e.target.checked)}
              className="w-4 h-4 mt-0.5 text-bajaj-blue rounded border-slate-300 focus:ring-bajaj-blue"
            />
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-0.5">
                Credit Bureau Enquiry Consent <span className="text-red-500">*</span>
              </span>
              I hereby authorize Bajaj Auto Finance Ltd. and its authorized representatives to pull my credit information report from CIBIL, Experian, Equifax, or CRIF High Mark for evaluating this loan application.
            </div>
          </label>
          {errors.credit_bureau_consent && (
            <p className="text-xs text-red-600 -mt-2 font-medium">{errors.credit_bureau_consent}</p>
          )}

          {/* KYC Consent */}
          <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
            errors.kyc_consent ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="checkbox"
              checked={consent.kyc_consent}
              onChange={(e) => updateConsent('kyc_consent', e.target.checked)}
              className="w-4 h-4 mt-0.5 text-bajaj-blue rounded border-slate-300 focus:ring-bajaj-blue"
            />
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-0.5">
                KYC Verification Consent <span className="text-red-500">*</span>
              </span>
              I explicitly consent to identity and address authentication using UIDAI Aadhaar / DigiLocker / NSDL PAN systems for the sole purpose of loan onboarding.
            </div>
          </label>
          {errors.kyc_consent && (
            <p className="text-xs text-red-600 -mt-2 font-medium">{errors.kyc_consent}</p>
          )}

          {/* Loan Declaration */}
          <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
            errors.loan_declaration ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="checkbox"
              checked={consent.loan_declaration}
              onChange={(e) => updateConsent('loan_declaration', e.target.checked)}
              className="w-4 h-4 mt-0.5 text-bajaj-blue rounded border-slate-300 focus:ring-bajaj-blue"
            />
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-0.5">
                Loan Application Declaration <span className="text-red-500">*</span>
              </span>
              I confirm that all statements and information provided in this 5-step form are true, complete, and accurate to the best of my knowledge.
            </div>
          </label>
          {errors.loan_declaration && (
            <p className="text-xs text-red-600 -mt-2 font-medium">{errors.loan_declaration}</p>
          )}

          {/* Privacy Acceptance */}
          <label className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition ${
            errors.privacy_acceptance ? 'border-red-400 bg-red-50/30' : 'border-slate-200 hover:bg-slate-50/50'
          }`}>
            <input
              type="checkbox"
              checked={consent.privacy_acceptance}
              onChange={(e) => updateConsent('privacy_acceptance', e.target.checked)}
              className="w-4 h-4 mt-0.5 text-bajaj-blue rounded border-slate-300 focus:ring-bajaj-blue"
            />
            <div className="text-xs text-slate-700">
              <span className="font-semibold text-slate-900 block mb-0.5">
                Privacy Policy & Terms Acceptance <span className="text-red-500">*</span>
              </span>
              I agree to the Bajaj Auto Finance Privacy Policy, customer terms, and fair practice code.
            </div>
          </label>
          {errors.privacy_acceptance && (
            <p className="text-xs text-red-600 -mt-2 font-medium">{errors.privacy_acceptance}</p>
          )}
        </div>
      </div>
    </div>
  );
};
