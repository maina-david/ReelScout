import { Component, HostListener, signal } from '@angular/core';

@Component({
  selector: 'app-shortcuts-overlay',
  templateUrl: './shortcuts-overlay.html',
})
export class ShortcutsOverlay {
  open = signal(false);

  shortcuts = [
    {
      label: 'Navigation',
      items: [
        { key: '/', description: 'Open search' },
        { key: 'Esc', description: 'Close modals / overlays' },
        { key: '?', description: 'Toggle this shortcuts panel' },
      ],
    },
    {
      label: 'Hero Banner',
      items: [
        { key: '← →', description: 'Browse hero items' },
        { key: 'T', description: 'Play trailer for current hero' },
      ],
    },
    {
      label: 'Detail Pages',
      items: [
        { key: 'T', description: 'Play trailer' },
        { key: 'Esc', description: 'Close trailer' },
      ],
    },
  ];

  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent): void {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    if (e.key === '?') this.open.set(!this.open());
    if (e.key === 'Escape') this.open.set(false);
  }
}
