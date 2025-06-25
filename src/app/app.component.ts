import { Component, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';

declare var confetti: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'AJ\'s Wordle';
  readonly rows = 6;
  readonly cols = 5;
  gameOver: boolean = false;
  botSuggestion: string = "";
  cheatsOn = false;

  gridLetters: string[] = [];
  gridColors: string[] = [];
  allowedGuesses: Set<string> = new Set();
  answer: string = '';

  keyStatusMap: Map<string, string> = new Map();

  wordIndex: number = 0;
  letterIndex: number = 0;

  Math = Math;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.reset();
  }

  toggleCheats() {
    this.cheatsOn = !this.cheatsOn;
    if (this.cheatsOn) {
      this.botSuggestion = this.pickNextGuess();
    } else {
      this.botSuggestion = "";
    }
  }

  /**
   * Confetti Cannon
   * */
  startConfettiRain() {
    const duration = 5 * 1000;
    const end = Date.now() + duration;

    const interval = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 5,
        angle: 90,
        spread: 55,
        origin: { x: Math.random(), y: 0 }
      });
    }, 200);
  }

  /**
 * Reset the game used by the new game button
 * */
  reset() {
    // Reset
    this.gridLetters = [];
    this.gridColors = [];
    this.allowedGuesses = new Set();
    this.answer = '';
    this.wordIndex = 0;
    this.letterIndex = 0;
    this.gameOver = false;
    this.keyStatusMap = new Map();
    this.botSuggestion = ""; // Clear suggestion initially

    this.gridLetters = Array.from({ length: this.rows * this.cols }, () => '');
    this.gridColors = Array.from({ length: this.rows * this.cols }, () => '');

    // Load allowed guesses
    this.http.get('assets/wordle-allowed-guesses.txt', { responseType: 'text' }).subscribe((data: string) => {
      const words = data.split('\n').map(w => w.trim().toLowerCase()).filter(w => w.length === 5);
      this.allowedGuesses = new Set(words);

      // Set initial bot suggestion after words are loaded
      if (this.cheatsOn) {
        this.botSuggestion = this.pickNextGuess();
      }
    });

    // Load answer
    this.http.get('assets/wordle-answers-alphabetical.txt', { responseType: 'text' }).subscribe((data: string) => {
      const words = data.split('\n').map(w => w.trim()).filter(w => w.length === 5);
      const randomIndex = Math.floor(Math.random() * words.length);
      this.answer = words[randomIndex].toUpperCase();
      console.log('ANSWER:', this.answer); // for testing!
    });
  }

  /**
   * Checks each guess and assigns colors
   * */
  submitGuess(): void {
    const guess = this.gridLetters
      .slice(this.wordIndex * this.cols, (this.wordIndex + 1) * this.cols)
      .join('')
      .toLowerCase();

    const answerArray = this.answer.split('');
    const guessArray = guess.toUpperCase().split('');

    const colors: string[] = Array(this.cols).fill('absent');
    const letterUsed: boolean[] = Array(this.cols).fill(false);

    if (guess.toUpperCase() === this.answer) {
      this.gameOver = true;
      this.startConfettiRain();
      this.botSuggestion = ""; // Clear suggestion when game is won

      // Green pass
      for (let i = 0; i < this.cols; i++) {
        if (guessArray[i] === answerArray[i]) {
          colors[i] = 'correct';
          this.keyStatusMap.set(guessArray[i], "correct");
          letterUsed[i] = true;
        }
      }

      // Apply colors
      for (let i = 0; i < this.cols; i++) {
        const cellIndex = this.wordIndex * this.cols + i;
        this.gridColors[cellIndex] = colors[i];
      }
    } else {
      if (!this.allowedGuesses.has(guess)) {
        // Temporarily flash red
        for (let i = 0; i < this.cols; i++) {
          const cellIndex = this.wordIndex * this.cols + i;
          this.gridColors[cellIndex] = 'wrong';
        }

        // Revert to default after 500ms
        setTimeout(() => {
          for (let i = 0; i < this.cols; i++) {
            const cellIndex = this.wordIndex * this.cols + i;
            this.gridColors[cellIndex] = '';
          }
        }, 500);

        return; // Don't update bot suggestion for invalid words
      }

      // Green pass
      for (let i = 0; i < this.cols; i++) {
        if (guessArray[i] === answerArray[i]) {
          colors[i] = 'correct';
          letterUsed[i] = true;
          this.keyStatusMap.set(guessArray[i], "correct");
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
          if (this.keyStatusMap.get(guessArray[i]) !== "correct") {
            this.keyStatusMap.set(guessArray[i], "present");
          }
        }
      }

      // Apply colors
      for (let i = 0; i < this.cols; i++) {
        const cellIndex = this.wordIndex * this.cols + i;
        this.gridColors[cellIndex] = colors[i];
        if (this.gridColors[cellIndex] === 'absent') {
          this.keyStatusMap.set(guessArray[i], 'miss');
        }
      }

      this.wordIndex++;
      this.letterIndex = 0;

      // Update bot suggestion after processing the guess
      if (this.wordIndex < 6) {
        if (this.cheatsOn) {
          this.botSuggestion = this.pickNextGuess();
        }
      } else {
        // Game over - lost
        this.gameOver = true;
        this.botSuggestion = "";
        alert(this.answer);
      }
    }
  }

  pickNextGuess(): string {
    // Return empty if no allowed guesses loaded yet or game is over
    if (this.allowedGuesses.size === 0 || this.gameOver) {
      return '';
    }

    // If we haven't made any guesses yet, return a good starting word
    if (this.wordIndex === 0) {
      return 'ADIEU';
    }

    // Get all previous guesses to avoid suggesting them again
    const previousGuesses = new Set<string>();
    for (let row = 0; row < this.wordIndex; row++) {
      const guess = this.gridLetters
        .slice(row * this.cols, (row + 1) * this.cols)
        .join('')
        .toLowerCase();
      if (guess.length === 5) {
        previousGuesses.add(guess);
      }
    }

    // Build constraints from the game state
    const correctPositions: string[] = Array(5).fill(''); // letter that must be in each position
    const presentLetters = new Set<string>(); // letters that must be in the word
    const forbiddenPositions = new Map<string, Set<number>>(); // letter -> positions it cannot be in
    const absentLetters = new Set<string>(); // letters that are not in the word at all

    // Analyze all previous guesses
    for (let row = 0; row < this.wordIndex; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cellIndex = row * this.cols + col;
        const letter = this.gridLetters[cellIndex];
        const color = this.gridColors[cellIndex];

        if (letter && color) {
          if (color === 'correct') {
            correctPositions[col] = letter;
          } else if (color === 'present') {
            presentLetters.add(letter);
            if (!forbiddenPositions.has(letter)) {
              forbiddenPositions.set(letter, new Set());
            }
            forbiddenPositions.get(letter)!.add(col);
          } else if (color === 'absent') {
            // Only mark as absent if it's not correct or present elsewhere
            let isCorrectElsewhere = false;
            let isPresentElsewhere = false;

            for (let checkRow = 0; checkRow < this.wordIndex; checkRow++) {
              for (let checkCol = 0; checkCol < this.cols; checkCol++) {
                const checkIndex = checkRow * this.cols + checkCol;
                if (this.gridLetters[checkIndex] === letter) {
                  if (this.gridColors[checkIndex] === 'correct') {
                    isCorrectElsewhere = true;
                  }
                  if (this.gridColors[checkIndex] === 'present') {
                    isPresentElsewhere = true;
                  }
                }
              }
            }

            if (!isCorrectElsewhere && !isPresentElsewhere) {
              absentLetters.add(letter);
            }
          }
        }
      }
    }

    console.log('Constraints:', {
      correctPositions,
      presentLetters: Array.from(presentLetters),
      forbiddenPositions: Object.fromEntries(forbiddenPositions),
      absentLetters: Array.from(absentLetters)
    });

    const remainingWords = Array.from(this.allowedGuesses).filter(word => {
      // Don't suggest words that have already been guessed
      if (previousGuesses.has(word)) {
        return false;
      }

      const upperWord = word.toUpperCase();

      // Check correct positions
      for (let i = 0; i < 5; i++) {
        if (correctPositions[i] && upperWord[i] !== correctPositions[i]) {
          return false;
        }
      }

      // Check that all present letters are in the word
      for (const letter of presentLetters) {
        if (!upperWord.includes(letter)) {
          return false;
        }
      }

      // Check forbidden positions for present letters
      for (const [letter, positions] of forbiddenPositions) {
        for (const pos of positions) {
          if (upperWord[pos] === letter) {
            return false;
          }
        }
      }

      // Check absent letters
      for (const letter of absentLetters) {
        if (upperWord.includes(letter)) {
          return false;
        }
      }

      return true;
    });

    console.log(`Remaining words: ${remainingWords.length}`, remainingWords.slice(0, 10));

    if (remainingWords.length === 0) {
      console.warn('No remaining words found! Using fallback.');
      return 'WORDS';
    }

    // If only one word remains, return it
    if (remainingWords.length === 1) {
      return remainingWords[0].toUpperCase();
    }

    // For multiple words, pick the one with the most common letters
    // in positions where we don't have constraints
    const letterCounts = new Map<string, number>();
    const positionCounts: Map<string, number>[] = Array.from({ length: 5 }, () => new Map());

    // Count letter frequencies
    for (const word of remainingWords) {
      for (let i = 0; i < word.length; i++) {
        const letter = word[i].toUpperCase();
        letterCounts.set(letter, (letterCounts.get(letter) || 0) + 1);
        positionCounts[i].set(letter, (positionCounts[i].get(letter) || 0) + 1);
      }
    }

    let bestWord = '';
    let bestScore = -1;

    for (const word of remainingWords) {
      const upperWord = word.toUpperCase();
      let score = 0;
      const uniqueLetters = new Set<string>();

      for (let i = 0; i < upperWord.length; i++) {
        const letter = upperWord[i];

        // Score based on position frequency
        score += positionCounts[i].get(letter) || 0;

        // Bonus for unique letters (helps eliminate more possibilities)
        if (!uniqueLetters.has(letter)) {
          score += (letterCounts.get(letter) || 0) * 0.1;
          uniqueLetters.add(letter);
        }
      }

      // Bonus for having more unique letters
      score += uniqueLetters.size * 2;

      if (score > bestScore) {
        bestScore = score;
        bestWord = word.toUpperCase();
      }
    }

    console.log('Best word:', bestWord, 'Score:', bestScore);
    return bestWord || 'WORDS';
  }

  /**
   * Handle keyboard inputs
   * @param event Key strokes
   */
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
