import React from 'react';
import { FullApplicationForm } from '../../types';
import { Briefcase, IndianRupee, Landmark } from 'lucide-react';

interface Props {
  formData: FullApplicationForm;
  onChange: (updater: (prev: FullApplicationForm) => FullApplicationForm) => void;
  errors: Record<string, string>;
}

const COMMON_BANKS = [
  'State Bank of India',
  'HDFC Bank',
  'ICICI Bank',
  'Bank of Baroda',
  'Punjab National Bank',
  'Canara Bank',
  'Axis Bank',
  'Bank of Maharashtra',
  'Union Bank of India',
  'Kotak Mahindra Bank',
  'IndusInd Bank',
];

export const Step3Financials: React.FC<Props> = ({ formData, onChange, errors }) => {
  const occ = formData.occupation;
  const bank = formData.bank;

  const updateOcc = (field: string, value: any) => {
    onChange((prev) => ({
      ...prev,
      occupation: { ...prev.occupation, [field]: value },
    }));
  };

  const updateBank = (field: string, value: any) => {
    onChange((prev) => ({
      ...prev,
      bank: { ...prev.bank, [field]: value },
    }));
  };

  const isBusinessOrSelf =
    occ.employment_type === 'Business' || occ.employment_type === 'Self-employed';
  const isSalaried = occ.employment_type === 'Salaried';

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Section 4: Occupation & Employment */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Briefcase className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">4. Occupation & Employment Details</h2>
            <p className="text-sm text-slate-500">Nature of livelihood and work experience</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Employment Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={occ.employment_type}
              onChange={(e) => updateOcc('employment_type', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Driver">Driver / Fleet Operator</option>
              <option value="Self-employed">Self-employed Individual</option>
              <option value="Business">Business Owner</option>
              <option value="Salaried">Salaried Employee</option>
              <option value="Daily Wage">Daily Wage Earner</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Occupation */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Primary Occupation <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Auto Driver / Small Shop Owner"
              value={occ.occupation}
              onChange={(e) => updateOcc('occupation', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.occupation ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.occupation && <p className="text-xs text-red-600 mt-1">{errors.occupation}</p>}
          </div>

          {/* Primary Income Source */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Income Source <span className="text-red-500">*</span>
            </label>
            <select
              value={occ.income_source}
              onChange={(e) => updateOcc('income_source', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Driving">Commercial Vehicle Driving</option>
              <option value="Business">Business Earnings</option>
              <option value="Salary">Monthly Salary</option>
              <option value="Rental">Rental Income</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Conditional Business Fields */}
          {isBusinessOrSelf && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Business / Trade Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Om Sai Auto Logistics"
                  value={occ.business_name || ''}
                  onChange={(e) => updateOcc('business_name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
                <select
                  value={occ.business_type || 'Proprietorship'}
                  onChange={(e) => updateOcc('business_type', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
                >
                  <option value="Proprietorship">Proprietorship</option>
                  <option value="Partnership">Partnership</option>
                  <option value="Private Limited">Private Limited</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Years of Business Experience
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={occ.business_experience ?? 5}
                  onChange={(e) => updateOcc('business_experience', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                />
              </div>
            </>
          )}

          {/* Conditional Salaried Fields */}
          {isSalaried && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Current Employer Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Employer / Company Name"
                  value={occ.employer_name || ''}
                  onChange={(e) => updateOcc('employer_name', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Years in Current Employment
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={occ.employment_years ?? 3}
                  onChange={(e) => updateOcc('employment_years', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 5: Income & Financial Info */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <IndianRupee className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">5. Income & Financial Details</h2>
            <p className="text-sm text-slate-500">Monthly earnings and existing loan obligations</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Monthly Gross Income */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monthly Gross Income (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">₹</span>
              <input
                type="number"
                min={0}
                value={occ.monthly_gross_income}
                onChange={(e) => updateOcc('monthly_gross_income', Number(e.target.value) || 0)}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                  errors.monthly_gross_income ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.monthly_gross_income && (
              <p className="text-xs text-red-600 mt-1">{errors.monthly_gross_income}</p>
            )}
          </div>

          {/* Monthly Net Income */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Monthly Net (In-Hand) Income (₹) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">₹</span>
              <input
                type="number"
                min={0}
                value={occ.monthly_net_income}
                onChange={(e) => updateOcc('monthly_net_income', Number(e.target.value) || 0)}
                className={`w-full pl-8 pr-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                  errors.monthly_net_income ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
                }`}
              />
            </div>
            {errors.monthly_net_income && (
              <p className="text-xs text-red-600 mt-1">{errors.monthly_net_income}</p>
            )}
          </div>

          {/* Household Expenses */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estimated Monthly Household Expenses (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">₹</span>
              <input
                type="number"
                min={0}
                value={occ.household_monthly_expenses || 15000}
                onChange={(e) => updateOcc('household_monthly_expenses', Number(e.target.value) || 0)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>
          </div>

          {/* Existing Loans Radio */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Do You Have Any Existing Loans? <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-6 mt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="existing_loan"
                  value="No"
                  checked={occ.existing_loan === 'No'}
                  onChange={() => {
                    updateOcc('existing_loan', 'No');
                    updateOcc('existing_emi', 0);
                  }}
                  className="w-4 h-4 text-bajaj-blue focus:ring-bajaj-blue"
                />
                <span className="text-sm text-slate-700">No Existing Loans</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="existing_loan"
                  value="Yes"
                  checked={occ.existing_loan === 'Yes'}
                  onChange={() => updateOcc('existing_loan', 'Yes')}
                  className="w-4 h-4 text-bajaj-blue focus:ring-bajaj-blue"
                />
                <span className="text-sm text-slate-700">Yes, have running loans</span>
              </label>
            </div>
          </div>

          {/* Conditional Existing EMI */}
          {occ.existing_loan === 'Yes' && (
            <div className={`md:col-span-2 p-4 rounded-lg border transition ${
              errors.existing_emi ? 'bg-red-50/50 border-red-300' : 'bg-amber-50 border-amber-200'
            }`}>
              <label className="block text-sm font-medium text-slate-900 mb-1">
                Total Existing Monthly EMI Amount (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative max-w-sm">
                <span className="absolute left-3.5 top-2.5 text-slate-400 font-semibold">₹</span>
                <input
                  type="number"
                  min={1}
                  placeholder="e.g. 4500"
                  value={occ.existing_emi || ''}
                  onChange={(e) => updateOcc('existing_emi', Number(e.target.value) || 0)}
                  className={`w-full pl-8 pr-3.5 py-2.5 rounded-lg border bg-white text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                    errors.existing_emi ? 'border-red-500 focus:ring-red-400' : 'border-amber-300'
                  }`}
                />
              </div>
              {errors.existing_emi && (
                <p className="text-xs text-red-600 mt-1.5 font-medium">{errors.existing_emi}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Section 6: Bank Account Details */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-bajaj-blue flex items-center justify-center font-bold">
            <Landmark className="w-5 h-5 text-bajaj-blue" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">6. Bank Account Details (Disbursal & NACH)</h2>
            <p className="text-sm text-slate-500">Bank account details for loan disbursement and monthly auto-debit</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bank Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <select
              value={bank.bank_name}
              onChange={(e) => updateBank('bank_name', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              {COMMON_BANKS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          {/* Account Holder Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Account Holder Name (As per passbook) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Ramesh Babu"
              value={bank.account_holder}
              onChange={(e) => updateBank('account_holder', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.account_holder ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.account_holder && (
              <p className="text-xs text-red-600 mt-1">{errors.account_holder}</p>
            )}
          </div>

          {/* Account Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Bank Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              placeholder="Enter Account Number"
              value={bank.account_number}
              onChange={(e) => updateBank('account_number', e.target.value.replace(/\D/g, ''))}
              className={`w-full px-3.5 py-2.5 font-mono rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.account_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.account_number && (
              <p className="text-xs text-red-600 mt-1">{errors.account_number}</p>
            )}
          </div>

          {/* Confirm Account Number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Confirm Bank Account Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Re-enter Account Number"
              value={bank.confirm_account_number}
              onChange={(e) => updateBank('confirm_account_number', e.target.value.replace(/\D/g, ''))}
              className={`w-full px-3.5 py-2.5 font-mono rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.confirm_account_number ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.confirm_account_number && (
              <p className="text-xs text-red-600 mt-1">{errors.confirm_account_number}</p>
            )}
          </div>

          {/* IFSC Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={11}
              placeholder="e.g. SBIN0004128"
              value={bank.ifsc}
              onChange={(e) => updateBank('ifsc', e.target.value.toUpperCase())}
              className={`w-full px-3.5 py-2.5 font-mono uppercase tracking-wider rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.ifsc ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.ifsc && <p className="text-xs text-red-600 mt-1">{errors.ifsc}</p>}
          </div>

          {/* Account Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
            <select
              value={bank.account_type}
              onChange={(e) => updateBank('account_type', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Savings">Savings Account</option>
              <option value="Current">Current Account</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
