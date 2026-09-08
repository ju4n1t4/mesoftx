import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { environment } from '../../../environment/environment';

export interface BackendStatus {
  name: string;
  status: 'operativo' | 'sin-conexion';
}

interface HealthResponse {
  status: string;
  service: string;
}

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  constructor(private readonly http: HttpClient) {}

  userMs(): Observable<BackendStatus> {
    return this.health(environment.userMsApiUrl.replace('/api/v1', ''), 'User_MS');
  }

  assesmentMs(): Observable<BackendStatus> {
    return this.health(environment.assesmentMsApiUrl.replace('/api/v1', ''), 'Assesment_MS');
  }

  private health(baseUrl: string, fallbackName: string): Observable<BackendStatus> {
    return this.http.get<HealthResponse>(`${baseUrl}/health`).pipe(
      map((response) => ({ name: response.service || fallbackName, status: 'operativo' as const })),
      catchError(() => of({ name: fallbackName, status: 'sin-conexion' as const }))
    );
  }
}
