
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import * as firebase from "firebase";
@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor() { }
  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    let userAuthenticated = firebase.auth().currentUser; 
    if (userAuthenticated) {
      return true;
    } else {
      return false;
    }
  }
}