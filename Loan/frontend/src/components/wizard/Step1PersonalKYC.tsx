import React from 'react';
import { FullApplicationForm } from '../../types';
import { User, ShieldCheck, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { DocumentUploadField } from './DocumentUploadField';

interface Props {
  formData: FullApplicationForm;
  onChange: (updater: (prev: FullApplicationForm) => FullApplicationForm) => void;
  errors: Record<string, string>;
}

export const Step1PersonalKYC: React.FC<Props> = ({ formData, onChange, errors }) => {
  const personal = formData.personal;
  const kyc = formData.kyc;

  const updatePersonal = (field: string, value: any) => {
    onChange((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: value },
    }));
  };

  // Max allowed date of birth: strictly older than 18 years
  const maxDob = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  })();

  const updateKYC = (field: string, value: any) => {
    onChange((prev) => ({
      ...prev,
      kyc: { ...prev.kyc, [field]: value },
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Section 1: Personal Details */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-bajaj-blue flex items-center justify-center font-bold">
            <User className="w-5 h-5 text-bajaj-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">1. Applicant Personal Information</h2>
            <p className="text-sm text-slate-500">Provide legal name and contact details matching government ID</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Applicant Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Babu"
              value={personal.applicant_full_name}
              onChange={(e) => updatePersonal('applicant_full_name', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.applicant_full_name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.applicant_full_name && (
              <p className="text-xs text-red-600 mt-1">{errors.applicant_full_name}</p>
            )}
          </div>

          {/* Date of Birth */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date of Birth <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                max={maxDob}
                value={personal.date_of_birth}
                onChange={(e) => updatePersonal('date_of_birth', e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                  errors.date_of_birth ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.date_of_birth && (
              <p className="text-xs text-red-600 mt-1">{errors.date_of_birth}</p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Gender <span className="text-red-500">*</span>
            </label>
            <select
              value={personal.gender}
              onChange={(e) => updatePersonal('gender', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>

          {/* Father's Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Father's Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Father's full name"
              value={personal.father_name}
              onChange={(e) => updatePersonal('father_name', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.father_name ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.father_name && (
              <p className="text-xs text-red-600 mt-1">{errors.father_name}</p>
            )}
          </div>

          {/* Mother's Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mother's Name</label>
            <input
              type="text"
              placeholder="Mother's full name"
              value={personal.mother_name || ''}
              onChange={(e) => updatePersonal('mother_name', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Mobile Number (OTP Verified) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-medium text-slate-400">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="10-digit mobile"
                value={personal.mobile_number}
                onChange={(e) => updatePersonal('mobile_number', e.target.value.replace(/\D/g, ''))}
                className={`w-full pl-12 pr-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                  errors.mobile_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.mobile_number && (
              <p className="text-xs text-red-600 mt-1">{errors.mobile_number}</p>
            )}
          </div>

          {/* Alternate Mobile */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alternate Mobile Number</label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-medium text-slate-400">+91</span>
              <input
                type="tel"
                maxLength={10}
                placeholder="Alternate 10-digit mobile"
                value={personal.alternate_mobile || ''}
                onChange={(e) => updatePersonal('alternate_mobile', e.target.value.replace(/\D/g, ''))}
                className="w-full pl-12 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="e.g. name@example.com"
              value={personal.email || ''}
              onChange={(e) => updatePersonal('email', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
            />
          </div>

          {/* Marital Status */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Marital Status</label>
            <select
              value={personal.marital_status || 'Married'}
              onChange={(e) => updatePersonal('marital_status', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Dependents Count */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Number of Dependents</label>
            <input
              type="number"
              min={0}
              max={20}
              value={personal.dependents_count ?? 2}
              onChange={(e) => updatePersonal('dependents_count', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 2: KYC & Identity */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">2. KYC & Identity Verification</h2>
            <p className="text-sm text-slate-500">Government identity details for authorised credit-bureau verification</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* PAN Number */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PAN Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={10}
              placeholder="e.g. ABCDE1234F"
              value={kyc.pan_number}
              onChange={(e) => updateKYC('pan_number', e.target.value.toUpperCase())}
              className={`w-full px-3.5 py-2.5 uppercase font-mono tracking-wider rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white ${
                errors.pan_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.pan_number ? (
              <p className="text-xs text-red-600 mt-1">{errors.pan_number}</p>
            ) : (
              <p className="text-xs text-slate-500 mt-1">Standard 10-character PAN format (5 letters, 4 numbers, 1 letter)</p>
            )}

            <DocumentUploadField
              label="PAN Card Document"
              required={true}
              document={kyc.pan_document}
              error={errors.pan_document}
              onUpload={(doc) => updateKYC('pan_document', doc)}
              onRemove={() => updateKYC('pan_document', null)}
            />
          </div>

          {/* Aadhaar Number */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Aadhaar Number (12 Digits) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={12}
              placeholder="12-digit Aadhaar"
              value={kyc.aadhaar_number}
              onChange={(e) => updateKYC('aadhaar_number', e.target.value.replace(/\D/g, ''))}
              className={`w-full px-3.5 py-2.5 font-mono tracking-wider rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white ${
                errors.aadhaar_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.aadhaar_number && (
              <p className="text-xs text-red-600 mt-1">{errors.aadhaar_number}</p>
            )}

            <DocumentUploadField
              label="Aadhaar Card Document"
              required={true}
              document={kyc.aadhaar_document}
              error={errors.aadhaar_document}
              onUpload={(doc) => updateKYC('aadhaar_document', doc)}
              onRemove={() => updateKYC('aadhaar_document', null)}
            />
          </div>

          {/* Driving Licence */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Driving Licence Number</label>
            <input
              type="text"
              placeholder="e.g. MH1220110008492"
              value={kyc.driving_licence || ''}
              onChange={(e) => updateKYC('driving_licence', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 uppercase rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            />

            <DocumentUploadField
              label="Driving Licence Document"
              required={false}
              document={kyc.driving_licence_document}
              error={errors.driving_licence_document}
              onUpload={(doc) => updateKYC('driving_licence_document', doc)}
              onRemove={() => updateKYC('driving_licence_document', null)}
            />
          </div>

          {/* Voter ID */}
          <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            <label className="block text-sm font-medium text-slate-700 mb-1">Voter ID (EPIC Number)</label>
            <input
              type="text"
              placeholder="e.g. VTR8892120"
              value={kyc.voter_id || ''}
              onChange={(e) => updateKYC('voter_id', e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 uppercase rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            />

            <DocumentUploadField
              label="Voter ID Document"
              required={false}
              document={kyc.voter_id_document}
              error={errors.voter_id_document}
              onUpload={(doc) => updateKYC('voter_id_document', doc)}
              onRemove={() => updateKYC('voter_id_document', null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
