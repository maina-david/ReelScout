import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackToTop } from './back-to-top/back-to-top';
import { Header } from './header/header';
import { ScrollProgress } from './scroll-progress/scroll-progress';
import { ShortcutsOverlay } from './shortcuts-overlay/shortcuts-overlay';
import { ToastComponent } from './toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Header, ToastComponent, BackToTop, ScrollProgress, ShortcutsOverlay],
  template: `
    <app-scroll-progress />
    <app-header />
    <router-outlet />
    <app-toast />
    <app-back-to-top />
    <app-shortcuts-overlay />
  `,
})
export class App {}
