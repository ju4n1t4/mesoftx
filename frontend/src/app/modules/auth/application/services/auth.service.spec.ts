import { describe, it, expect, vi } from 'vitest';
import { of, firstValueFrom, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { HttpAuthGateway } from '../../infra/gateways/http-auth.gateway';
import { SessionStorageService } from '../../../../shared/session-storage/session-storage.service';
import { ThemeConfigService } from '../../../../shared/services/theme-config.service';
import { authGuard } from '../guards/auth.guard';
import { roleGuard } from '../guards/role.guard';
import { jwtInterceptor } from '../interceptors/jwt.interceptor';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { HttpRequest, HttpResponse } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { MESOFTX_THEME } from '../../../../config/themes';

const jwt = (extra: Record<string, unknown> = {}) => `header.${btoa(JSON.stringify({ sub:'7', role_id:2, role:'Profesor', perms:['RUBRIC_FILL'], exp:Math.floor(Date.now()/1000)+600, ...extra }))}.signature`;
const user = {id:7,name:'Teacher',email:'teacher@example.org',document_number:'T01',role_id:2,program_id:'IT1',active:true};
function setup() {
 const storage = new SessionStorageService();
 const router = { navigate: vi.fn(), createUrlTree: vi.fn((path: string[]) => path) };
 const gateway = { login:vi.fn(()=>of({access_token:jwt(),token_type:'bearer'})),mode:vi.fn(()=>of({demo_enabled:true,demo_roles:['profesor']})),demoLogin:vi.fn(()=>of({access_token:jwt(),token_type:'bearer'})),user:vi.fn(()=>of(user)) };
 const service = new AuthService(gateway,router as never,storage);
 return { service,gateway,storage,router };
}

describe('Session, authorization and API boundary', () => {
 it('logs in, restores a temporary session, authorizes routes and logs out',async()=>{
  const context=TestBed.runInInjectionContext(setup);
  const {service,gateway,storage,router}=context;
  const result=await firstValueFrom(service.login('teacher@example.org','secret'));
  expect(result.role).toBe('Profesor');expect(service.hasPermission('RUBRIC_FILL')).toBe(true);
  expect(localStorage.getItem('mesoftx_token')).toBeNull();
  expect(service.hasValidSession()).toBe(true);
  const restored=new AuthService(gateway,router as never,storage);
  expect(restored.user()?.id).toBe(7);
  const injector = Injector.create({providers:[{provide:AuthService,useValue:service},{provide:Router,useValue:router}]});
  const authorize = <T>(fn: () => T) => runInInjectionContext(injector,fn);
  expect(authorize(()=>authGuard({} as never,{} as never))).toBe(true);
  expect(authorize(()=>roleGuard({data:{roles:['Profesor']}} as never,{} as never))).toBe(true);
  expect(authorize(()=>roleGuard({data:{roles:['Auditor']}} as never,{} as never))).toEqual(['/auth/login']);
  expect(authorize(()=>roleGuard({data:{permissions:['RUBRIC_FILL']}} as never,{} as never))).toBe(true);
  expect(authorize(()=>roleGuard({data:{permissions:['USER_CRUD']}} as never,{} as never))).toEqual(['/cuenta']);
  const next=vi.fn(()=>of(new HttpResponse()));
  authorize(()=>jwtInterceptor(new HttpRequest('GET',`${environment.assesmentApiUrl}/so`),next));
  expect(next.mock.calls[0][0].headers.get('Authorization')).toContain('Bearer');
  authorize(()=>jwtInterceptor(new HttpRequest('GET',`${environment.assesmentApiUrl}/public/indicators`),next));
  expect(next.mock.calls[1][0].headers.has('Authorization')).toBe(false);
  service.logout();expect(service.user()).toBeNull();
  expect(authorize(()=>authGuard({} as never,{} as never))).toEqual(['/auth/login']);
 });
 it('rejects invalid, expired and inactive sessions and propagates profile failures',async()=>{
  const {service,gateway,storage,router}=TestBed.runInInjectionContext(setup);
  for(const token of ['invalid',jwt({exp:1})]){
   gateway.login.mockReturnValueOnce(of({access_token:token,token_type:'bearer'}));
   await expect(firstValueFrom(service.login('x','p'))).rejects.toThrow();
  }
  gateway.user.mockReturnValueOnce(throwError(()=>new Error('Unavailable')));
  await expect(firstValueFrom(service.login('x','p'))).rejects.toThrow('Unavailable');
  expect(service.getToken()).toBeNull();
  gateway.user.mockReturnValueOnce(of({...user,active:false}));
  await expect(firstValueFrom(service.login('x','p'))).rejects.toThrow('Inactive');
  storage.set('mesoftx_token',jwt());storage.set('mesoftx_user','invalid JSON');
  expect(new AuthService(gateway,router as never,storage).user()).toBeNull();
  expect(service.hasValidSession()).toBe(false);
 });
 it('loads mode, handles disabled/offline mode, and retains missing role as null',async()=>{
  const {service,gateway}=TestBed.runInInjectionContext(setup);
  expect((await firstValueFrom(service.getAuthMode())).demo_enabled).toBe(true);
  gateway.mode.mockReturnValueOnce(throwError(()=>new Error('Offline')));
  expect((await firstValueFrom(service.getAuthMode())).demo_enabled).toBe(false);
  gateway.demoLogin.mockReturnValueOnce(of({access_token:jwt({role:undefined}),token_type:'bearer'}));
  await firstValueFrom(service.demoLogin('profesor'));expect(service.role()).toBeNull();
 });
 it('maps all supported roles and demo account status',async()=>{
  const {service,gateway,router}=TestBed.runInInjectionContext(setup);
  for(const [role,route] of [['Coordinador','/coordinador/dashboard'],['Administrativo','/admin/dashboard'],['Auditor','/auditor/dashboard'],['Other','/cuenta']]){
   gateway.demoLogin.mockReturnValueOnce(of({access_token:jwt({role}),token_type:'bearer'}));
   gateway.user.mockReturnValueOnce(of({...user,email:'demo.coordinador@demo.mesoftx.local'}));
   await firstValueFrom(service.demoLogin(role));expect(service.isDemo()).toBe(true);expect(router.navigate).toHaveBeenLastCalledWith([route]);
  }
 });
 it('applies the central theme tokens and authenticates exclusively through the backend',()=>{
  TestBed.runInInjectionContext(()=>new ThemeConfigService().apply());
  expect(document.documentElement.style.getPropertyValue('--primary')).toBe(MESOFTX_THEME['--primary']);
  const http={post:vi.fn(()=>of({})),get:vi.fn(()=>of({}))};const gateway=new HttpAuthGateway(http as never);
  gateway.login('x','p');gateway.mode();gateway.demoLogin('profesor');gateway.user(7);
  expect(http.post.mock.calls[0]).toEqual([`${environment.userApiUrl}/auth/login`,{email:'x',password:'p'}]);
  expect(http.get.mock.calls[1][0]).toBe(`${environment.userApiUrl}/users/7`);
 });
});
