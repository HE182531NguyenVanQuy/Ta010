export interface UserDto {
  userId: string;
  email: string;
  fullName: string;
  phone?: string;
  role: string;
  statusCode: string;
  statusDisplayName: string;
  createdAt?: string;
}

export interface UserDetailDto {
  userId: string;
  email: string;
  fullName: string;
  avatar?: string;
  phone?: string;
  location?: string;
  totalScore?: number;
  totalExams?: number;
  role: string;
  statusId: string;
  statusCode: string;
  statusDisplayName: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserPagedResponse {
  items: UserDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errorCode?: string;
  statusCode: number;
}
