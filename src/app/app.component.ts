import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Wordle';
  readonly rows = 6;
  readonly cols = 5;

  gridLetters: string[] = [];
  gridColors: string[] = [];
  allowedGuesses: Set<string> = new Set();
  answer: string = '';

  wordIndex: number = 0;
  letterIndex: number = 0;

  Math = Math;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.gridLetters = Array.from({ length: this.rows * this.cols }, () => '');
    this.gridColors = Array.from({ length: this.rows * this.cols }, () => '');

    // Load allowed guesses
    this.http.get('assets/wordle-allowed-guesses.txt', { responseType: 'text' }).subscribe((data: string) => {
      const words = data.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length === 5);
      this.allowedGuesses = new Set(words);
    });

    // Load answer
    this.http.get('assets/wordle-answers-alphabetical.txt', { responseType: 'text' }).subscribe((data: string) => {
      const words = data.split('\n').map(w => w.trim()).filter(w => w.length === 5);
      const randomIndex = Math.floor(Math.random() * words.length);
      this.answer = words[randomIndex].toUpperCase();
      console.log('ANSWER:', this.answer); // for testing
    });
  }

  submitGuess(): void {
    const guess = this.gridLetters
      .slice(this.wordIndex * this.cols, (this.wordIndex + 1) * this.cols)
      .join('')
      .toLowerCase();

    if (!this.allowedGuesses.has(guess)) {
      alert(`"${guess}" is not in the allowed guesses list.`);
      return;
    }

    const answerArray = this.answer.split('');
    const guessArray = guess.toUpperCase().split('');

    const colors: string[] = Array(this.cols).fill('absent');
    const letterUsed: boolean[] = Array(this.cols).fill(false);

    // Green pass
    for (let i = 0; i < this.cols; i++) {
      if (guessArray[i] === answerArray[i]) {
        colors[i] = 'correct';
        letterUsed[i] = true;
      }
    }

    // Yellow pass
    for (let i = 0; i < this.cols; i++) {
      if (colors[i] === 'correct') continue;

      const indexInAnswer = answerArray.findIndex(
        (char, idx) => char === guessArray[i] && !letterUsed[idx]
      );

      if (indexInAnswer !== -1) {
        colors[i] = 'present';
        letterUsed[indexInAnswer] = true;
      }
    }

    // Apply colors
    for (let i = 0; i < this.cols; i++) {
      const cellIndex = this.wordIndex * this.cols + i;
      this.gridColors[cellIndex] = colors[i];
    }

    this.wordIndex++;
    this.letterIndex = 0;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    const key = event.key;

    if (/^[a-zA-Z]$/.test(key)) {
      if (this.letterIndex < this.cols && this.wordIndex < this.rows) {
        const cellIndex = this.wordIndex * this.cols + this.letterIndex;
        this.gridLetters[cellIndex] = key.toUpperCase();
        this.letterIndex++;
      }
    } else if (key === 'Backspace') {
      if (this.letterIndex > 0) {
        this.letterIndex--;
        const cellIndex = this.wordIndex * this.cols + this.letterIndex;
        this.gridLetters[cellIndex] = '';
      }
    } else if (key === 'Enter') {
      if (this.letterIndex === this.cols) {
        this.submitGuess();
      }
    }
  }
}
