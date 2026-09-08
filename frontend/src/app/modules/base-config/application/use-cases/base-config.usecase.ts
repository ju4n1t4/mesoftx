import { Injectable } from '@angular/core';

import { BackendBaseConfigGateway } from '../../infra/gateways/backend-base-config.gateway';

@Injectable({ providedIn: 'root' })
export class BaseConfigUseCase {
  constructor(readonly gateway: BackendBaseConfigGateway) {}
}
