import { describe,it,expect,vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../auth/application/services/auth.service';
import { LoginComponent } from '../../../auth/presentation/pages/login/login.component';
import { UserGateway } from '../../application/ports/user-api.service.port';
import { CuentaComponent } from '../pages/cuenta/cuenta.component';
import { LegalComponent } from '../pages/legal/legal.component';
import { AdminLayoutComponent } from '../layouts/admin-layout/admin-layout.component';
import { CoordinadorLayoutComponent } from '../layouts/coordinador-layout/coordinador-layout.component';
import { ProfesorLayoutComponent } from '../layouts/profesor-layout/profesor-layout.component';
import { AuditorLayoutComponent } from '../layouts/auditor-layout/auditor-layout.component';
import { IntegracionesComponent } from '../pages/admin/integraciones/integraciones.component';
import { fixtures,failed,connection } from '../../../../../testing/fixtures';

describe('Authentication, account and integration administration',()=>{
 it('validates login, labels demo roles and shows each server error class',()=>{
  const f=fixtures();const p=new LoginComponent(f.fb,f.auth as never);p.ngOnInit();p.onSubmit();expect(p.f('email').touched).toBe(true);p.form.patchValue({email:'teacher@example.org',password:'fixture'});p.onSubmit();expect(f.auth.login).toHaveBeenCalled();p.togglePass();expect(p.showPass()).toBe(true);expect(p.roleLabel('profesor')).toBe('Profesor');p.enterDemo('profesor');
  f.auth.demoLogin.mockReturnValueOnce(failed());p.enterDemo('profesor');expect(p.demoLoading()).toBe(false);
  for(const status of [429,403,0,401]){f.auth.login.mockReturnValueOnce(failed(status));p.onSubmit();expect(p.loading()).toBe(false);expect(p.errorMsg()).toBeTruthy();}
 });
 it('validates and rotates the current password and preserves errors from the backend',()=>{
  const f=fixtures();TestBed.configureTestingModule({providers:[FormBuilder,{provide:AuthService,useValue:f.auth},{provide:UserGateway,useValue:f.api}]});
  const p=TestBed.runInInjectionContext(()=>new CuentaComponent());p.submit();expect(p.form.invalid).toBe(true);
  p.form.patchValue({current:'old',next:'short',again:'short'});expect(p.form.invalid).toBe(true);p.form.patchValue({next:'LettersOnlyPassword',again:'LettersOnlyPassword'});expect(p.form.invalid).toBe(true);
  p.form.patchValue({next:'Fixture-password-2026',again:'Fixture-password-2026'});p.submit();expect(p.ok()).toBe(true);
  f.api.changeMyPassword.mockReturnValueOnce(failed());p.form.patchValue({current:'old',next:'Fixture-password-2026',again:'Fixture-password-2026'});p.submit();expect(p.error()).toBeTruthy();
  expect(p.home()).toBe('/profesor/dashboard');
 });
 it('displays the legal document selected by route data',()=>{
  TestBed.configureTestingModule({providers:[{provide:ActivatedRoute,useValue:{data:of({doc:'privacidad'})}}]});
  const page=TestBed.runInInjectionContext(()=>new LegalComponent());page.ngOnInit();expect(page).toBeTruthy();
 });
 it.each([AdminLayoutComponent,CoordinadorLayoutComponent,ProfesorLayoutComponent,AuditorLayoutComponent])('renders identity and forwards logout from %s',(Class)=>{
  const f=fixtures();const p=new Class(f.auth as never);expect(p.fullName()).toBe('Teacher Example');expect(p.initial()).toBe('T');p.logout();expect(f.auth.logout).toHaveBeenCalled();
 });
 it('creates and selects connections, probes, synchronizes and reads persisted history',()=>{
  const f=fixtures();const p=new IntegracionesComponent(f.integrations as never);p.ngOnInit();expect(p.connections()).toHaveLength(1);p.select(1);expect(p.runs()).toHaveLength(1);expect(p.records()).toHaveLength(1);p.probe();expect(p.message()).toContain('correctamente');p.sync();expect(p.message()).toContain('1 registros');
  p.newConnection();p.save();expect(p.message()).toContain('Indique');p.draft={...connection,secret:'one-time-credential'};p.save();expect(f.integrations.create).toHaveBeenCalled();expect(p.draft.secret).toBe('');
  p.select(1);p.save();expect(f.integrations.update).toHaveBeenCalled();expect(f.integrations.sync.mock.calls[0][1]).toMatch(/[0-9a-f-]+/);
 });
 it('reports integration load, save, probe, sync and history failures',()=>{
  const f=fixtures();const p=new IntegracionesComponent(f.integrations as never);p.ngOnInit();p.select(1);
  f.integrations.probe.mockReturnValueOnce(failed());p.probe();expect(p.busy()).toBe(false);
  f.integrations.sync.mockReturnValueOnce(failed());p.sync();expect(p.message()).toContain('No se pudo sincronizar');
  f.integrations.update.mockReturnValueOnce(failed());p.save();expect(p.message()).toContain('No se pudo guardar');
  f.integrations.runs.mockReturnValueOnce(failed());p.select(1);expect(p.message()).toContain('historial');
  f.integrations.list.mockReturnValueOnce(failed());p.reload();expect(p.message()).toContain('cargar');
 });
});
