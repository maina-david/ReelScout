import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-scroll-progress',
  template: `
    <div
      class="fixed top-0 left-0 h-[3px] bg-[#e50914] z-[999] transition-none pointer-events-none"
      [style.width.%]="pct()"
    ></div>
  `,
})
export class ScrollProgress {
  pct = signal(0);

  @HostListener('window:scroll')
  onScroll(): void {
    const el = document.documentElement;
    const scrolled = el.scrollTop || document.body.scrollTop;
    const total = el.scrollHeight - el.clientHeight;
    this.pct.set(total > 0 ? Math.round((scrolled / total) * 100) : 0);
  }
}
