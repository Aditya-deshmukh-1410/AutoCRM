export type Role = "admin" | "employee" | "platform_admin";

export interface SignupForm {
  firstName: string;
  lastName: string;
  phone: string; // 10 digits, +91 is added on send
  email: string;
  password: string;
  showroomName: string;
  address: string;
  pincode: string;
  employeeRange: string;
}

export const EMPLOYEE_RANGES = ["1-10", "11-25", "26-50", "51-100", "101-250", "250+"] as const;

export const toE164 = (phone: string) => `+91${phone.replace(/\D/g, "")}`;
