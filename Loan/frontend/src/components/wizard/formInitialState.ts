import { FullApplicationForm } from '../../types';

export const INITIAL_FORM_STATE: FullApplicationForm = {
  personal: {
    applicant_full_name: '',
    date_of_birth: '',
    gender: 'Male',
    father_name: '',
    mother_name: '',
    mobile_number: '',
    alternate_mobile: '',
    email: '',
    marital_status: 'Married',
    dependents_count: 2,
  },
  kyc: {
    pan_number: '',
    aadhaar_number: '',
    voter_id: '',
    driving_licence: '',
    passport_number: '',
    kyc_status: 'Pending Verification',
    pan_document: null,
    aadhaar_document: null,
    driving_licence_document: null,
    voter_id_document: null,
  },
  address: {
    door_flat: '',
    street: '',
    locality: '',
    city: '',
    district: '',
    state: 'Maharashtra',
    pincode: '',
    address_type: 'Rented',
    years_at_address: 3,
    permanent_same: true,
    perm_door_flat: '',
    perm_street: '',
    perm_locality: '',
    perm_city: '',
    perm_district: '',
    perm_state: 'Maharashtra',
    perm_pincode: '',
  },
  occupation: {
    employment_type: 'Driver',
    occupation: 'Auto-Rickshaw Driver',
    business_name: '',
    business_type: 'Proprietorship',
    business_address: '',
    business_experience: 5,
    employer_name: '',
    employment_years: 3,
    income_source: 'Driving',
    monthly_gross_income: 35000,
    monthly_net_income: 30000,
    additional_monthly_income: 0,
    household_monthly_income: 40000,
    household_monthly_expenses: 16000,
    existing_loan: 'No',
    existing_loan_types: [],
    existing_emi: 0,
  },
  bank: {
    bank_name: 'State Bank of India',
    account_holder: '',
    account_number: '',
    confirm_account_number: '',
    ifsc: '',
    account_type: 'Savings',
  },
  coapplicant: {
    has_coapplicant: false,
    coapplicant_name: '',
    coapplicant_relationship: 'Spouse',
    coapplicant_dob: '',
    coapplicant_mobile: '',
    coapplicant_pan: '',
    coapplicant_occupation: 'Home Maker',
    coapplicant_income: 0,
  },
  references: {
    has_references: false,
    reference1_name: '',
    reference1_mobile: '',
    reference1_relationship: 'Friend',
    reference2_name: '',
    reference2_mobile: '',
    reference2_relationship: 'Relative',
  },
  consent: {
    credit_bureau_consent: false,
    kyc_consent: false,
    loan_declaration: false,
    privacy_acceptance: false,
    electronic_communication: false,
  },
};

const STORAGE_KEY = 'bajaj_loan_application_draft_v1';
const STEP_KEY = 'bajaj_loan_application_step_v1';

export const saveDraft = (data: FullApplicationForm, step: number) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(STEP_KEY, step.toString());
  } catch (e) {
    console.error('Failed to save draft to localStorage', e);
  }
};

export const loadDraft = (): { data: FullApplicationForm; step: number } | null => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    const rawStep = localStorage.getItem(STEP_KEY);
    if (!rawData) return null;
    return {
      data: JSON.parse(rawData),
      step: rawStep ? parseInt(rawStep, 10) : 1,
    };
  } catch (e) {
    console.error('Failed to load draft from localStorage', e);
    return null;
  }
};

export const clearDraft = () => {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STEP_KEY);
};
