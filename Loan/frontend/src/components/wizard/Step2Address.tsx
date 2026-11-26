import React from 'react';
import { FullApplicationForm } from '../../types';
import { Home, MapPin } from 'lucide-react';

interface Props {
  formData: FullApplicationForm;
  onChange: (updater: (prev: FullApplicationForm) => FullApplicationForm) => void;
  errors: Record<string, string>;
}

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Jammu and Kashmir', 'Puducherry'
];

export const Step2Address: React.FC<Props> = ({ formData, onChange, errors }) => {
  const address = formData.address;

  const updateAddress = (field: string, value: any) => {
    onChange((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Current Residential Address */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 pb-4 mb-6 border-b border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Home className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">3. Current Residential Address</h2>
            <p className="text-sm text-slate-500">Where you currently reside</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Door / Flat */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Door / Flat / House Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Flat 302, Sai Heights"
              value={address.door_flat}
              onChange={(e) => updateAddress('door_flat', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.door_flat ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.door_flat && <p className="text-xs text-red-600 mt-1">{errors.door_flat}</p>}
          </div>

          {/* Street Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Street / Road Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. MG Road, Near Bus Stand"
              value={address.street}
              onChange={(e) => updateAddress('street', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.street ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.street && <p className="text-xs text-red-600 mt-1">{errors.street}</p>}
          </div>

          {/* Locality */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Area / Locality <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Shivaji Nagar"
              value={address.locality}
              onChange={(e) => updateAddress('locality', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.locality ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.locality && <p className="text-xs text-red-600 mt-1">{errors.locality}</p>}
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              City / Town <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Pune"
              value={address.city}
              onChange={(e) => updateAddress('city', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.city ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
          </div>

          {/* District */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              District <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Pune"
              value={address.district}
              onChange={(e) => updateAddress('district', e.target.value)}
              className={`w-full px-3.5 py-2.5 rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.district ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.district && <p className="text-xs text-red-600 mt-1">{errors.district}</p>}
          </div>

          {/* State */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              State / Union Territory <span className="text-red-500">*</span>
            </label>
            <select
              value={address.state}
              onChange={(e) => updateAddress('state', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* PIN Code */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              PIN Code (6 Digits) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 411001"
              value={address.pincode}
              onChange={(e) => updateAddress('pincode', e.target.value.replace(/\D/g, ''))}
              className={`w-full px-3.5 py-2.5 font-mono rounded-lg border text-sm transition focus:ring-2 focus:ring-bajaj-blue focus:outline-none ${
                errors.pincode ? 'border-red-500 bg-red-50/30' : 'border-slate-300'
              }`}
            />
            {errors.pincode && <p className="text-xs text-red-600 mt-1">{errors.pincode}</p>}
          </div>

          {/* Address Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Address Ownership Type <span className="text-red-500">*</span>
            </label>
            <select
              value={address.address_type}
              onChange={(e) => updateAddress('address_type', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
            >
              <option value="Owned">Owned</option>
              <option value="Rented">Rented</option>
              <option value="Family Owned">Family Owned</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Years at Address */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Years at Current Address
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={address.years_at_address ?? 3}
              onChange={(e) => updateAddress('years_at_address', parseInt(e.target.value, 10) || 0)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
            />
          </div>
        </div>

        {/* Checkbox: Permanent Address Same as Current */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <label className="inline-flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={address.permanent_same}
              onChange={(e) => updateAddress('permanent_same', e.target.checked)}
              className="w-4 h-4 text-bajaj-blue rounded border-slate-300 focus:ring-bajaj-blue"
            />
            <span className="text-sm font-medium text-slate-800">
              Permanent Address is the same as Current Residential Address
            </span>
          </label>
        </div>
      </div>

      {/* Conditional Permanent Address Section */}
      {!address.permanent_same && (
        <div className="bg-white rounded-xl p-6 border border-amber-200 bg-amber-50/10 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-3 pb-4 mb-6 border-b border-amber-100">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Permanent Address Details</h2>
              <p className="text-sm text-slate-500">Provide your permanent native home address</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Permanent Door / Flat No. <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Door/Flat number"
                value={address.perm_door_flat || ''}
                onChange={(e) => updateAddress('perm_door_flat', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Permanent Street Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Street name"
                value={address.perm_street || ''}
                onChange={(e) => updateAddress('perm_street', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Permanent Locality <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Area / Locality"
                value={address.perm_locality || ''}
                onChange={(e) => updateAddress('perm_locality', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Permanent City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="City"
                value={address.perm_city || ''}
                onChange={(e) => updateAddress('perm_city', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Permanent State</label>
              <select
                value={address.perm_state || 'Maharashtra'}
                onChange={(e) => updateAddress('perm_state', e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none bg-white"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Permanent PIN Code</label>
              <input
                type="text"
                maxLength={6}
                placeholder="6-digit PIN"
                value={address.perm_pincode || ''}
                onChange={(e) => updateAddress('perm_pincode', e.target.value.replace(/\D/g, ''))}
                className="w-full px-3.5 py-2.5 font-mono rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-bajaj-blue focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
