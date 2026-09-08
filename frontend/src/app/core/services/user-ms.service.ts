import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { UserResponse } from '../models/api.models';

export interface RoleRecord {
  id: number;
  name: string;
  description?: string | null;
}

export interface CareerRecord {
  id: number;
  name: string;
  code: string;
  faculty_id: number;
  description?: string | null;
}

export interface SubjectRecord {
  id: number;
  name: string;
  code: string;
  career_id: number;
  description?: string | null;
}

export interface UserPayload {
  name: string;
  surname: string;
  code: string;
  email: string;
  password?: string;
  role_id: number;
  career_id: number;
  subject_ids: number[];
}

@Injectable({ providedIn: 'root' })
export class UserMsService {
  constructor(private readonly http: HttpClient) {}

  roles(): Observable<RoleRecord[]> {
    return this.http.get<RoleRecord[]>(`${environment.userMsApiUrl}/roles`);
  }

  careers(): Observable<CareerRecord[]> {
    return this.http.get<CareerRecord[]>(`${environment.userMsApiUrl}/careers`);
  }

  subjects(): Observable<SubjectRecord[]> {
    return this.http.get<SubjectRecord[]>(`${environment.userMsApiUrl}/subjects`);
  }

  users(): Observable<UserResponse[]> {
    return this.http.get<UserResponse[]>(`${environment.userMsApiUrl}/users`);
  }

  createUser(payload: UserPayload): Observable<UserResponse> {
    return this.http.post<UserResponse>(`${environment.userMsApiUrl}/users`, payload);
  }

  updateUser(id: number, payload: Partial<UserPayload>): Observable<UserResponse> {
    return this.http.put<UserResponse>(`${environment.userMsApiUrl}/users/${id}`, payload);
  }

  activateUser(id: number): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${environment.userMsApiUrl}/users/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<UserResponse> {
    return this.http.patch<UserResponse>(`${environment.userMsApiUrl}/users/${id}/deactivate`, {});
  }
}
