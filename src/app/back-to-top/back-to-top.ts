import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-back-to-top',
  template: `
    @if (show()) {
      <button
        class="fixed bottom-6 right-6 z-40 bg-[#e50914] hover:bg-[#f40612] text-white w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors animate-fade-in"
        (click)="scrollToTop()"
        aria-label="Back to top"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/>
        </svg>
      </button>
    }
  `,
})
export class BackToTop {
  show = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.show.set(window.scrollY > 300);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
