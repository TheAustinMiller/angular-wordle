import { Component, OnInit, HostListener } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Wordle';
  lastKey: string = '';

  readonly rows = 6;
  readonly cols = 5;

  grid: any[] = [];

  Math = Math;

  ngOnInit() {
    this.grid = Array.from({ length: this.rows * this.cols });
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (/^[a-zA-Z]$/.test(event.key)) {
      this.lastKey = event.key;
      console.log('Key pressed:', event.key);
    }
  }
}
