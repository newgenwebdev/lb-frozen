export type UserStatus = "active" | "non-active";
export type UserRole = "Owner" | "Admin";

// API Response Types
export type UserAPI = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "owner"; // API uses lowercase
  status: "Active" | "Non Active"; // API uses capitalized with space
  created_at: string;
  updated_at: string;
};

export type UserAPIListResponse = {
  users: UserAPI[];
  count: number;
  limit: number;
  offset: number;
};

export type UserAPIGetResponse = {
  user: UserAPI;
};

// UI Types
export type User = {
  id: string;
  displayId: string; // e.g., "2109"
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
};

export type UserListResponse = {
  users: User[];
  count: number;
  page: number;
  limit: number;
};

export type UserFormData = {
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  password?: string; // Only for create
};

// API Query Parameters
export type UserListParams = {
  limit?: number;
  offset?: number;
  role?: "admin" | "owner" | "all";
  status?: "Active" | "Non Active" | "all";
  q?: string; // Search query for name or email
};

