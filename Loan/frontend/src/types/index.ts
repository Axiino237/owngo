export type ApplicationStatus = 'NEW' | 'WORK_IN_PROGRESS' | 'COMPLETED';
export type EligibilityStatus = 'PENDING' | 'YES' | 'NO';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export interface Application {
  id: string;
  applicationId: string;
  status: ApplicationStatus;
  eligibility: EligibilityStatus;
  applicantFullName: string;
  mobileNumber: string;
  panNumber?: string;
  formData: FullApplicationForm;
  lockedByAdminId?: string | null;
  lockedByAdminName?: string | null;
  lockedAt?: string | null;
  completedByAdminId?: string | null;
  completedByAdminName?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedDoc {
  fileName: string;
  fileSize: string;
  fileType: string;
  dataUrl: string;
}

export interface FullApplicationForm {
  personal: {
    applicant_full_name: string;
    date_of_birth: string;
    gender: string;
    father_name: string;
    mother_name?: string;
    mobile_number: string;
    alternate_mobile?: string;
    email?: string;
    marital_status?: string;
    dependents_count?: number;
  };
  kyc: {
    pan_number: string;
    aadhaar_number: string;
    voter_id?: string;
    driving_licence?: string;
    passport_number?: string;
    kyc_status?: string;
    pan_document?: UploadedDoc | null;
    aadhaar_document?: UploadedDoc | null;
    driving_licence_document?: UploadedDoc | null;
    voter_id_document?: UploadedDoc | null;
  };
  address: {
    door_flat: string;
    street: string;
    locality: string;
    city: string;
    district: string;
    state: string;
    pincode: string;
    address_type: string;
    years_at_address?: number;
    permanent_same: boolean;
    // Conditional permanent address
    perm_door_flat?: string;
    perm_street?: string;
    perm_locality?: string;
    perm_city?: string;
    perm_district?: string;
    perm_state?: string;
    perm_pincode?: string;
  };
  occupation: {
    employment_type: string; // Salaried / Self-employed / Business / Driver / Daily Wage / Other
    occupation: string;
    business_name?: string;
    business_type?: string;
    business_address?: string;
    business_experience?: number;
    employer_name?: string;
    employment_years?: number;
    income_source: string;
    monthly_gross_income: number;
    monthly_net_income: number;
    additional_monthly_income?: number;
    household_monthly_income?: number;
    household_monthly_expenses?: number;
    existing_loan: string; // Yes / No
    existing_loan_types?: string[];
    existing_emi?: number;
  };
  bank: {
    bank_name: string;
    account_holder: string;
    account_number: string;
    confirm_account_number: string;
    ifsc: string;
    account_type: string;
  };
  coapplicant?: {
    has_coapplicant: boolean;
    coapplicant_name?: string;
    coapplicant_relationship?: string;
    coapplicant_dob?: string;
    coapplicant_mobile?: string;
    coapplicant_pan?: string;
    coapplicant_occupation?: string;
    coapplicant_income?: number;
  };
  references?: {
    has_references: boolean;
    reference1_name?: string;
    reference1_mobile?: string;
    reference1_relationship?: string;
    reference2_name?: string;
    reference2_mobile?: string;
    reference2_relationship?: string;
  };
  consent: {
    credit_bureau_consent: boolean;
    kyc_consent: boolean;
    loan_declaration: boolean;
    privacy_acceptance: boolean;
    electronic_communication?: boolean;
  };
}
