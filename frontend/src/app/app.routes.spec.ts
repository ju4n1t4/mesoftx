import { describe,it,expect } from 'vitest';
import { Route } from '@angular/router';
import { routes } from './app.routes';
import { appConfig } from './app.config';

const flatten=(items: Route[]): Route[]=>items.flatMap(item=>[item,...flatten(item.children??[])]);
describe('Lazy module contracts',()=>{
 it('resolves every lazy route to a component while keeping private module entry guards',async()=>{
  const all=flatten(routes);
  for(const route of all.filter(route=>route.loadComponent)){
   const component=await (route.loadComponent!() as Promise<unknown>);
   expect(typeof component).toBe('function');
  }
  for(const prefix of ['admin','profesor','coordinador','auditor']){
   const entry=routes.find(route=>route.path===prefix)!;
   expect(entry.canActivate?.length).toBeGreaterThanOrEqual(2);expect(entry.canActivateChild?.length).toBeGreaterThanOrEqual(1);
  }
  expect(appConfig.providers.length).toBeGreaterThan(0);
 });
});
