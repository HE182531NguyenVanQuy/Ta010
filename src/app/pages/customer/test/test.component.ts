import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ExamService } from '../../../services/exam.service';

// Trạng thái của mỗi ô câu hỏi trong nav grid
export type NavState = 'empty' | 'answered';

export interface Question {
  questionId: string;
  questionNumber: number;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
}

export interface ExamData {
  examId: string;
  title: string;
  description?: string;
  durationTime: number;
  questionsCount?: number;
}

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './test.component.html',
  styleUrl: './test.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestComponent implements OnInit, OnDestroy, AfterViewInit {

  // ── API Data ────────────────────────────────────────────────
  examData: ExamData | null = null;
  questions: Question[] = [];
  loading = true;
  attemptId: string | null = null;
  currentExamId = '';
  modalVisible = false;
  submitting = false;
  submitted = false;
  reviewMode = false;
  correctCount = 0;
  finalScore = 0;
  private receivedApiScore = false;
  scoringErrorMessage = '';

  // ── Câu trả lời người dùng ──────────────────────────────────
  userAnswers: { [questionId: string]: string } = {};

  // ── Trạng thái nav ô: empty | answered
  navStates: { [questionId: string]: NavState } = {};

  // ── Trạng thái class từng option: { questionId: {A:'', B:'selected'...} }
  optionStates: { [questionId: string]: { [opt: string]: string } } = {};

  // ── Giải thích visible ──────────────────────────────────────
  explVisible: { [questionId: string]: boolean } = {};

  private readonly STORAGE_KEY = 'examPracticeProgress_v1';

  private get storage(): Storage | null {
    return typeof localStorage === 'undefined' ? null : localStorage;
  }

  private get isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  // ── Chung ───────────────────────────────────────────────────
  savedProgress  = false;

  get saveLabel(): string { return this.savedProgress ? '💾 Đã lưu' : '💾 Lưu bài'; }

  // ── Timer ───────────────────────────────────────────────────
  secsLeft = 45 * 60;

  get durationMinutes(): number {
    return this.examData?.durationTime ?? 45;
  }

  get totalSecs(): number {
    return this.durationMinutes * 60;
  }

  get timerDisplay(): string {
    const m = Math.floor(this.secsLeft / 60);
    const s = this.secsLeft % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  get timerBarWidth():  string  { return (this.secsLeft / this.totalSecs * 100) + '%'; }
  get timerWarning():   boolean { return this.secsLeft <= 300 && this.secsLeft > 60; }
  get timerDanger():    boolean { return this.secsLeft <= 60; }

  private timerInterval: ReturnType<typeof setInterval> | null = null;

  // ── Tiến độ (computed) ──────────────────────────────────────
  get answeredCount(): number { return Object.keys(this.userAnswers).length; }
  get totalQuestions(): number { return this.questions.length; }
  get remainCount():   number { return this.totalQuestions - this.answeredCount; }
  get wrongCount():    number { return Math.max(0, this.answeredCount - this.correctCount); }
  get skippedCount():  number { return Math.max(0, this.totalQuestions - this.answeredCount); }
  get scoreDisplay(): string { return this.finalScore.toFixed(2); }
  get progressPct():   string { return this.totalQuestions > 0 ? Math.round(this.answeredCount / this.totalQuestions * 100) + '%' : '0%'; }
  get progressWidth(): string { return this.totalQuestions > 0 ? Math.round(this.answeredCount / this.totalQuestions * 100) + '%' : '0%'; }

  // ── Danh sách số câu cho *ngFor ─────────────────────────────
  get questionNums(): number[] {
    return Array.from({ length: this.totalQuestions }, (_, i) => i + 1);
  }

  constructor(
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private examService: ExamService
  ) {}

  // ── Helper to convert index to letter (0->A, 1->B, etc) ─────
  String = String;
  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getQuestionOptions(question: Question): string[] {
    return [question.optionA, question.optionB, question.optionC, question.optionD]
      .filter((option): option is string => !!option);
  }

  getCorrectAnswer(question: Question): string {
    return (question.correctAnswer ?? '').trim().toUpperCase();
  }

  isQuestionCorrect(question: Question): boolean {
    const correctAnswer = this.getCorrectAnswer(question);
    return !!correctAnswer && this.userAnswers[question.questionId] === correctAnswer;
  }

  getExplanationClass(question: Question): string {
    if (!this.reviewMode) return '';
    return this.isQuestionCorrect(question) ? 'explanation-correct' : 'explanation-wrong';
  }

  private getEmptyOptionState(question: Question): { [opt: string]: string } {
    return this.getQuestionOptions(question).reduce((state, _option, index) => {
      state[this.getOptionLetter(index)] = '';
      return state;
    }, {} as { [opt: string]: string });
  }

  ngOnInit(): void {
    if (!this.isBrowser) {
      this.loading = false;
      return;
    }

    this.loadExamData();
  }
  ngAfterViewInit():  void { this.startTimer(); }
  ngOnDestroy():      void { this.stopTimer(); }

  // ── Load exam from API ──────────────────────────────────────
  async loadExamData(): Promise<void> {
    try {
      this.loading = true;
      
      // Get exam ID from URL params or use default
      const queryParams = this.route.snapshot.queryParamMap;
      const examId = queryParams.get('examId') || 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
      this.currentExamId = examId;
      
      // Fetch exam with questions from API
      const response = await this.examService.getExamWithQuestions(examId);
      this.examData = response.data?.exam;
      this.questions = response.data?.questions || [];
      
      // Initialize state for each question
      this.questions.forEach(q => {
        this.navStates[q.questionId] = 'empty';
        this.explVisible[q.questionId] = false;
        this.optionStates[q.questionId] = this.getEmptyOptionState(q);
      });

      this.secsLeft = this.totalSecs;
      //this.loadProgress();

      await this.ensureAttempt().catch(error => {
        console.warn('Could not create exam attempt while loading:', error);
      });

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading exam:', error);
      // TODO: Show error message to user
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  // ── Khởi tạo state sạch ─────────────────────────────────────
  initState(): void {
    this.savedProgress = false;
    this.submitted = false;
    this.reviewMode = false;
    this.correctCount = 0;
    this.finalScore = 0;
    this.receivedApiScore = false;
    this.scoringErrorMessage = '';
    this.userAnswers  = {};
    this.navStates    = {};
    this.optionStates = {};
    this.explVisible  = {};
    this.questions.forEach(q => {
      this.navStates[q.questionId]    = 'empty';
      this.explVisible[q.questionId]  = false;
      this.optionStates[q.questionId] = this.getEmptyOptionState(q);
    });
  }

  loadProgress(): void {
    const storage = this.storage;
    if (!storage) {
      this.initState();
      return;
    }

    const raw = storage.getItem(this.STORAGE_KEY);
    if (!raw) {
      this.initState();
      return;
    }

    try {
      const data = JSON.parse(raw);
      if (!data || data.saved !== true) {
        this.initState();
        return;
      }

      this.savedProgress = true;

      const savedAt = typeof data.savedAt === 'number' ? data.savedAt : null;
      const savedSecsLeft = typeof data.secsLeft === 'number' ? data.secsLeft : this.totalSecs;
      const elapsed = savedAt ? Math.floor((Date.now() - savedAt) / 1000) : 0;
      this.secsLeft = Math.max(0, savedSecsLeft - elapsed);

      this.userAnswers  = data.userAnswers  ?? {};
      this.navStates    = data.navStates    ?? {};
      this.optionStates = data.optionStates ?? {};
      this.explVisible  = data.explVisible  ?? {};

      if (Object.keys(this.navStates).length === 0) {
        this.initState();
      }
    } catch {
      this.initState();
    }
  }

  onSave(): void {
    // Only store progress when the user explicitly clicks "Lưu bài".
    this.savedProgress = true;
    this.saveProgress();
  }

  saveProgress(): void {
    if (!this.savedProgress) return;

    const storage = this.storage;
    if (!storage) return;

    const payload = {
      saved: true,
      savedAt: Date.now(),
      secsLeft: this.secsLeft,
      userAnswers: this.userAnswers,
      navStates: this.navStates,
      optionStates: this.optionStates,
      explVisible: this.explVisible,
    };

    try {
      storage.setItem(this.STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // If localStorage is unavailable or quota is exceeded, we silently ignore.
    }
  }

  clearProgress(): void {
    const storage = this.storage;
    if (!storage) return;

    try {
      storage.removeItem(this.STORAGE_KEY);
    } catch {
      // Ignore if storage is unavailable.
    }
  }

  // ── Chọn đáp án ─────────────────────────────────────────────
  async selectOpt(questionId: string, opt: string): Promise<void> {
    if (this.submitted || this.reviewMode) return;

    // Reset tất cả option của câu này → set option được chọn
    const question = this.questions.find(q => q.questionId === questionId);
    this.optionStates[questionId] = question ? this.getEmptyOptionState(question) : {};
    this.optionStates[questionId][opt] = 'selected';

    // Lưu đáp án
    this.userAnswers[questionId] = opt;

    // ✅ Mark as answered (only "answered" state, no correct/wrong during exam)
    this.navStates[questionId] = 'answered';

    // Khi user thay đổi đáp án thì cần bấm "Lưu bài" mới lưu lại.
    this.savedProgress = false;

    // Submit answer to API
    if (this.attemptId) {
      try {
        await this.examService.submitAnswer(this.attemptId, {
          questionId: questionId,
          userAnswer: opt
        });
      } catch (error) {
        console.error('Error submitting answer:', error);
        // TODO: Show error message to user
      }
    }

    this.cdr.markForCheck();
  }

  // ── CSS class cho option ────────────────────────────────────
  getOptionClass(questionId: string, opt: string, question?: Question): string {
    if (this.reviewMode && question) {
      const correctAnswer = this.getCorrectAnswer(question);
      const selectedAnswer = this.userAnswers[questionId];

      if (correctAnswer === opt) return 'reveal-correct';
      if (selectedAnswer === opt && selectedAnswer !== correctAnswer) return 'wrong';
    }

    return this.optionStates[questionId]?.[opt] ?? '';
  }

  private async ensureAttempt(): Promise<void> {
    if (this.attemptId) return;

    const queryParams = this.route.snapshot.queryParamMap;
    const userId = queryParams.get('userId') || this.storage?.getItem('userId');
    const examId = this.currentExamId || queryParams.get('examId') || this.examData?.examId;

    if (!examId) {
      throw new Error('Không tìm thấy mã đề thi để tạo lượt làm bài chấm điểm.');
    }

    const attemptResponse = await this.examService.startExamAttempt({
      examId,
      userId: userId || null
    });
    const attemptPayload = attemptResponse as any;
    const attempt = attemptPayload.data ?? attemptPayload;
    this.attemptId = attempt.userExamAttemptId;
  }

  private async syncAnswersToAttempt(): Promise<void> {
    if (!this.attemptId) return;

    for (const [questionId, userAnswer] of Object.entries(this.userAnswers)) {
      await this.examService.submitAnswer(this.attemptId, {
        questionId,
        userAnswer
      });
    }
  }

  // ── CSS class cho ô nav ─────────────────────────────────────
  getNavClass(questionId: string): string {
    if (this.reviewMode) {
      const question = this.questions.find(q => q.questionId === questionId);
      if (!question) return '';
      return this.isQuestionCorrect(question) ? 'nav-correct' : 'nav-wrong';
    }

    switch (this.navStates[questionId]) {
      case 'answered': return 'nav-answered';
      default:         return '';
    }
  }

  // Class cho badge số câu bên trái
  getQNumClass(questionId: string): string {
    if (this.reviewMode) {
      const question = this.questions.find(q => q.questionId === questionId);
      if (!question) return '';
      return this.isQuestionCorrect(question) ? 'correct-q' : 'wrong-q';
    }

    switch (this.navStates[questionId]) {
      case 'answered': return 'answered';
      default:         return '';
    }
  }

  // ── Scroll đến câu hỏi ──────────────────────────────────────
  scrollToQ(questionId: string): void {
    document.getElementById('q' + questionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  // ── Nộp bài thi ────────────────────────────────────────────
  async submitExam(): Promise<void> {
    if (this.submitting || this.submitted) return;

    try {
      this.submitting = true;
      this.modalVisible = true;
      this.scoringErrorMessage = '';
      this.cdr.markForCheck();

      await this.ensureAttempt();
      await this.syncAnswersToAttempt();

      const result = await this.examService.submitExam(this.attemptId!, {
        userAnswers: this.userAnswers
      });
      const resultPayload = result as any;
      const submittedAttempt = resultPayload.data ?? resultPayload;
      this.applySubmittedAttempt(submittedAttempt);
    } catch (error) {
      console.error('Error submitting exam:', error);
      this.scoringErrorMessage = error instanceof Error
        ? error.message
        : 'Không nộp được bài lên hệ thống chấm điểm.';
    } finally {
      this.submitting = false;
      if (this.receivedApiScore) {
        this.submitted = true;
        this.stopTimer();
        this.clearProgress();
      }
      this.cdr.markForCheck();
    }
  }

  private applySubmittedAttempt(submittedAttempt: any): void {
    const submittedQuestions = submittedAttempt?.questions ?? submittedAttempt?.Questions;
    if (Array.isArray(submittedQuestions) && submittedQuestions.length > 0) {
      const questionsById = new Map<string, Question>(
        submittedQuestions.map((question: any) => [
          question.questionId ?? question.QuestionId,
          this.normalizeQuestion(question)
        ])
      );
      this.questions = this.questions.map(question => {
        const updated = questionsById.get(question.questionId);
        if (!updated) return question;
        return {
          ...question,
          ...updated,
          correctAnswer: updated.correctAnswer || question.correctAnswer,
          explanation: updated.explanation || question.explanation,
        };
      });
    }

    const correctAnswers = submittedAttempt?.correctAnswers ?? submittedAttempt?.CorrectAnswers;
    this.correctCount = typeof correctAnswers === 'number' ? correctAnswers : 0;

    const rawScore = Number(submittedAttempt?.score ?? submittedAttempt?.Score);
    this.finalScore = Number.isFinite(rawScore)
      ? (rawScore > 10 ? rawScore / 10 : rawScore)
      : 0;
    this.receivedApiScore = true;
  }

  private normalizeQuestion(question: any): Question {
    const correctAnswer = question.correctAnswer ?? question.CorrectAnswer;
    return {
      questionId: question.questionId ?? question.QuestionId,
      questionNumber: question.questionNumber ?? question.QuestionNumber,
      section: question.section ?? question.Section,
      questionText: question.questionText ?? question.QuestionText,
      optionA: question.optionA ?? question.OptionA,
      optionB: question.optionB ?? question.OptionB,
      optionC: question.optionC ?? question.OptionC,
      optionD: question.optionD ?? question.OptionD,
      correctAnswer: typeof correctAnswer === 'string' ? correctAnswer.trim().toUpperCase() : correctAnswer,
      explanation: question.explanation ?? question.Explanation,
    };
  }

  confirmResult(): void {
    this.modalVisible = false;
    this.reviewMode = true;

    this.questions.forEach(question => {
      this.explVisible[question.questionId] = true;
    });

    this.cdr.markForCheck();
  }

  // ── Làm lại ─────────────────────────────────────────────────
  resetExam(): void {
    this.initState();
    this.modalVisible = false;
    this.submitting = false;
    this.clearProgress();
    this.resetTimer();
    this.cdr.markForCheck();
  }

  // ── Timer ───────────────────────────────────────────────────
  startTimer(): void {
    if (this.timerInterval) return;

    this.timerInterval = setInterval(() => {
      this.secsLeft = Math.max(0, this.secsLeft - 1);
      if (this.secsLeft <= 0) {
        this.stopTimer();
        this.submitExam();
      }
      this.cdr.markForCheck();
    }, 1000);
  }

  stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  resetTimer(): void {
    this.stopTimer();
    this.secsLeft = this.totalSecs;
    this.startTimer();
  }
}
