import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ChangeDetectionStrategy, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ExamSecurityReport, ExamService } from '../../../services/exam.service';

// Trạng thái của mỗi ô câu hỏi trong nav grid
export type NavState = 'empty' | 'answered';

export interface Question {
  questionId: string;
  questionNumber: number | null;
  section?: string;
  questionText: string;
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctAnswer?: string;
  explanation?: string;
  importOrder?: number;
  displayOrder?: number;
  sourceRow?: number;
}

export interface ExamData {
  examId: string;
  title: string;
  description?: string;
  durationTime: number;
  questionsCount?: number;
}

interface QuestionSection {
  key: string;
  title: string;
  subtitle: string;
  questions: Question[];
}

interface AltTabEvent {
  index: number;
  leftAt: string;
  returnedAt?: string | null;
  durationSeconds: number;
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
  private passageOnlyQuestions: Question[] = [];
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
  securityMessage = '';
  autoSubmitReason = '';
  private readonly ALT_TAB_LIMIT = 3;
  private altTabEvents: AltTabEvent[] = [];
  private currentAwayEvent: AltTabEvent | null = null;
  private autoSubmittingForSecurity = false;
  private securityListenersAttached = false;
  private readonly handleVisibilityChange = () => this.onVisibilityChange();
  private readonly handleWindowBlur = () => this.registerPageExit();
  private readonly handleWindowFocus = () => this.registerPageReturn();

  get altTabCount(): number { return this.altTabEvents.length; }
  get altTabLimit(): number { return this.ALT_TAB_LIMIT; }
  get totalAwaySeconds(): number {
    return this.altTabEvents.reduce((total, event) => total + event.durationSeconds, 0);
  }

  // ── Câu trả lời người dùng ──────────────────────────────────
  userAnswers: { [questionId: string]: string } = {};
  questionDisplayText: { [questionId: string]: string } = {};
  questionPassages: { [questionId: string]: string } = {};
  questionSections: QuestionSection[] = [];

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
      .filter((option): option is string => this.isRealOption(option));
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
    this.attachSecurityListeners();
  }
  ngAfterViewInit():  void { this.startTimer(); }
  ngOnDestroy():      void {
    this.stopTimer();
    this.detachSecurityListeners();
  }

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
      this.setQuestions(response.data?.questions || []);
      
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
    this.securityMessage = '';
    this.autoSubmitReason = '';
    this.altTabEvents = [];
    this.currentAwayEvent = null;
    this.autoSubmittingForSecurity = false;
    this.userAnswers  = {};
    this.navStates    = {};
    this.optionStates = {};
    this.explVisible  = {};
    this.questions.forEach(q => {
      this.navStates[q.questionId]    = 'empty';
      this.explVisible[q.questionId]  = false;
      this.optionStates[q.questionId] = this.getEmptyOptionState(q);
    });
    this.rebuildQuestionDisplay(this.passageOnlyQuestions);
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
  private attachSecurityListeners(): void {
    if (!this.isBrowser || this.securityListenersAttached) return;

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('focus', this.handleWindowFocus);
    this.securityListenersAttached = true;
  }

  private detachSecurityListeners(): void {
    if (!this.isBrowser || !this.securityListenersAttached) return;

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('focus', this.handleWindowFocus);
    this.securityListenersAttached = false;
  }

  private onVisibilityChange(): void {
    if (document.hidden) {
      this.registerPageExit();
      return;
    }

    this.registerPageReturn();
  }

  private registerPageExit(): void {
    if (this.submitted || this.reviewMode || this.submitting || this.loading) return;
    if (this.currentAwayEvent) return;

    this.currentAwayEvent = {
      index: this.altTabEvents.length + 1,
      leftAt: new Date().toISOString(),
      durationSeconds: 0
    };
  }

  private registerPageReturn(): void {
    if (!this.currentAwayEvent) return;

    const returnedAt = new Date();
    const leftAt = new Date(this.currentAwayEvent.leftAt);
    const durationSeconds = Math.max(1, Math.round((returnedAt.getTime() - leftAt.getTime()) / 1000));

    const completedEvent: AltTabEvent = {
      ...this.currentAwayEvent,
      returnedAt: returnedAt.toISOString(),
      durationSeconds
    };

    this.currentAwayEvent = null;
    this.altTabEvents = [...this.altTabEvents, completedEvent];
    this.securityMessage = `Cảnh báo: bạn đã rời màn hình ${this.altTabCount}/${this.altTabLimit} lần. Lần này kéo dài ${durationSeconds} giây.`;

    if (this.altTabCount >= this.altTabLimit) {
      this.autoSubmitForSecurity();
    }

    this.cdr.markForCheck();
  }

  private async autoSubmitForSecurity(): Promise<void> {
    if (this.autoSubmittingForSecurity || this.submitting || this.submitted) return;

    this.autoSubmittingForSecurity = true;
    this.autoSubmitReason = `Tự động nộp bài vì rời màn hình ${this.altTabLimit} lần.`;
    this.securityMessage = this.autoSubmitReason;
    this.cdr.markForCheck();

    await this.submitExam();
  }

  private buildSecurityReport(autoSubmitted: boolean): ExamSecurityReport | null {
    const events = this.getCompletedSecurityEvents();
    if (events.length === 0) return null;

    const currentUser = this.getStoredCurrentUser();

    return {
      reason: autoSubmitted ? 'AUTO_SUBMIT_ALT_TAB_LIMIT' : 'ALT_TAB_ACTIVITY_DETECTED',
      altTabCount: events.length,
      threshold: this.altTabLimit,
      totalAwaySeconds: events.reduce((total, event) => total + event.durationSeconds, 0),
      autoSubmitted,
      studentEmail: currentUser?.email ?? null,
      studentUserId: currentUser?.userId ?? null,
      clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      userAgent: navigator.userAgent,
      events
    };
  }

  private getCompletedSecurityEvents(): AltTabEvent[] {
    if (!this.currentAwayEvent) return this.altTabEvents;

    const now = new Date();
    const leftAt = new Date(this.currentAwayEvent.leftAt);
    const openEvent: AltTabEvent = {
      ...this.currentAwayEvent,
      returnedAt: null,
      durationSeconds: Math.max(1, Math.round((now.getTime() - leftAt.getTime()) / 1000))
    };

    return [...this.altTabEvents, openEvent];
  }

  private getStoredCurrentUser(): { userId?: string; email?: string } | null {
    const storage = this.storage;
    if (!storage) return null;

    try {
      const raw = storage.getItem('tao10_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

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

    const currentUser = this.getStoredCurrentUser();
    const attemptResponse = await this.examService.startExamAttempt({
      examId,
      userId: userId || currentUser?.userId || null
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

      const securityReport = this.buildSecurityReport(this.autoSubmittingForSecurity);
      const result = await this.examService.submitExam(this.attemptId!, {
        userAnswers: this.userAnswers,
        securityReport
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
      } else {
        this.autoSubmittingForSecurity = false;
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
      this.questions = this.sortQuestions(this.questions.map(question => {
        const updated = questionsById.get(question.questionId);
        if (!updated) return question;
        return {
          ...question,
          ...updated,
          correctAnswer: updated.correctAnswer || question.correctAnswer,
          explanation: updated.explanation || question.explanation,
        };
      }));
      this.rebuildQuestionDisplay(this.passageOnlyQuestions);
    }

    const correctAnswers = submittedAttempt?.correctAnswers ?? submittedAttempt?.CorrectAnswers;
    this.correctCount = typeof correctAnswers === 'number' ? correctAnswers : 0;

    const rawScore = Number(submittedAttempt?.score ?? submittedAttempt?.Score);
    this.finalScore = Number.isFinite(rawScore) ? rawScore : 0;
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
      importOrder: question.importOrder ?? question.ImportOrder ?? question.displayOrder ?? question.DisplayOrder ?? question.sourceRow ?? question.SourceRow,
      displayOrder: question.displayOrder ?? question.DisplayOrder,
      sourceRow: question.sourceRow ?? question.SourceRow,
    };
  }

  private setQuestions(rawQuestions: Question[]): void {
    const indexedQuestions = rawQuestions.map((question, index) => ({
      ...question,
      importOrder: this.getQuestionImportOrder(question, index),
    }));

    this.passageOnlyQuestions = indexedQuestions.filter(question => !this.isAnswerableQuestion(question));
    this.questions = this.sortQuestions(indexedQuestions.filter(question => this.isAnswerableQuestion(question)));
    this.rebuildQuestionDisplay(this.passageOnlyQuestions);
  }

  private isAnswerableQuestion(question: Question): boolean {
    return this.getQuestionOptions(question).length > 0;
  }

  private isRealOption(option: unknown): option is string {
    if (typeof option !== 'string') return option !== null && option !== undefined && String(option).trim() !== '';

    const value = option.trim();
    return !!value && !['N/A', 'NA', 'NULL', 'NONE', '-'].includes(value.toUpperCase());
  }

  private getQuestionImportOrder(question: Question, fallbackIndex = 0): number {
    const candidates = [question.importOrder, question.displayOrder, question.sourceRow];

    for (const candidate of candidates) {
      const value = Number(candidate);
      if (Number.isFinite(value)) return value;
    }

    return fallbackIndex;
  }

  private sortQuestions(questions: Question[]): Question[] {
    return [...questions].sort((left, right) => {
      const leftNumber = Number(left.questionNumber);
      const rightNumber = Number(right.questionNumber);

      if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && leftNumber !== rightNumber) {
        return leftNumber - rightNumber;
      }

      const leftOrder = this.getQuestionImportOrder(left);
      const rightOrder = this.getQuestionImportOrder(right);
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;

      return String(left.questionId).localeCompare(String(right.questionId));
    });
  }

  private rebuildQuestionDisplay(passageOnlyQuestions: Question[]): void {
    this.questionDisplayText = {};
    this.questionPassages = {};

    this.attachStandalonePassages(passageOnlyQuestions);
    this.extractRepeatedPassagesFromAnswerableQuestions();
    this.questionSections = this.buildQuestionSections();
  }

  private attachStandalonePassages(passageOnlyQuestions: Question[]): void {
    const readingPassages = [...passageOnlyQuestions].sort(
      (left, right) => this.getQuestionImportOrder(left) - this.getQuestionImportOrder(right)
    ).filter(question =>
      this.isReadingSection(question.section) || this.looksLikePassage(question.questionText)
    );

    for (const [index, passage] of readingPassages.entries()) {
      const target =
        this.findImportOrderPassageTarget(passage) ??
        this.findFixedPassageTarget(passage, index) ??
        this.findFirstQuestionForPassage(passage);
      if (!target || this.questionPassages[target.questionId]) continue;

      this.questionPassages[target.questionId] = passage.questionText;
    }
  }

  private findImportOrderPassageTarget(passage: Question): Question | undefined {
    const passageOrder = this.getQuestionImportOrder(passage, Number.NaN);
    if (!Number.isFinite(passageOrder)) return undefined;

    return this.questions.find(question => this.getQuestionImportOrder(question) > passageOrder);
  }

  private findFixedPassageTarget(passage: Question, index: number): Question | undefined {
    const ordinal =
      this.extractReadingOrdinal(`${passage.section || ''} ${passage.questionText || ''}`) ??
      this.inferStandalonePassageOrdinal(passage) ??
      (index + 1);

    const startQuestionByOrdinal: Record<number, number> = {
      1: 25,
      2: 31,
    };
    const startQuestionNumber = startQuestionByOrdinal[ordinal];

    if (!startQuestionNumber) return undefined;
    return this.questions.find(question => Number(question.questionNumber) === startQuestionNumber);
  }

  private findReadingGroupTargets(): Question[] {
    const sectionTargets = this.groupConsecutiveQuestionsBySection(this.questions)
      .filter(group =>
        !!this.normalizeSection(group[0]?.section) &&
        this.isReadingSection(group[0]?.section)
      )
      .map(group => group[0])
      .filter((question): question is Question => !!question);

    const repeatedTextTargets = this.findRepeatedPassageGroupTargets();
    const seen = new Set<string>();

    return [...sectionTargets, ...repeatedTextTargets].filter(question => {
      if (seen.has(question.questionId)) return false;
      seen.add(question.questionId);
      return true;
    });
  }

  private findRepeatedPassageGroupTargets(): Question[] {
    const targets: Question[] = [];
    let index = 0;

    while (index < this.questions.length - 1) {
      const passage = this.extractSharedPassageFromRepeatedText(
        this.questions.slice(index, index + 2)
      );

      if (!passage) {
        index++;
        continue;
      }

      targets.push(this.questions[index]);

      let end = index + 2;
      while (
        end < this.questions.length &&
        this.extractSharedPassageFromRepeatedText(this.questions.slice(index, end + 1))
      ) {
        end++;
      }

      index = end;
    }

    return targets;
  }

  private findFirstQuestionForPassage(passage: Question): Question | undefined {
    const passageNumber = Number(passage.questionNumber);
    const section = this.normalizeSection(passage.section);
    const passageOrdinal =
      this.extractReadingOrdinal(`${passage.section || ''} ${passage.questionText || ''}`) ??
      this.inferStandalonePassageOrdinal(passage);
    const readingGroups = this.findReadingQuestionGroups();

    if (passageOrdinal !== null) {
      const ordinalGroup = readingGroups.find(group => group.ordinal === passageOrdinal);
      if (ordinalGroup?.questions[0]) return ordinalGroup.questions[0];
    }

    if (section) {
      const sameSection = this.questions.find(question =>
        this.normalizeSection(question.section) === section
      );
      if (sameSection) return sameSection;
    }

    if (Number.isFinite(passageNumber)) {
      const laterQuestion = this.questions.find(question => Number(question.questionNumber) >= passageNumber);
      if (laterQuestion) return laterQuestion;
    }

    return readingGroups[0]?.questions[0] ?? this.questions[0];
  }

  private findReadingQuestionGroups(): { ordinal: number | null; questions: Question[] }[] {
    return this.buildQuestionGroups()
      .filter(group =>
        this.isReadingSection(group.questions[0]?.section) ||
        this.extractReadingOrdinal(group.title) !== null ||
        group.questions.some(question => this.looksLikePassage(question.questionText))
      )
      .map(group => ({
        ordinal: this.extractReadingOrdinal(group.title),
        questions: group.questions,
      }));
  }

  private extractRepeatedPassagesFromAnswerableQuestions(): void {
    for (const question of this.questions) {
      this.questionDisplayText[question.questionId] = question.questionText;
    }

    const groups = this.groupConsecutiveQuestionsBySection(this.questions);

    for (const group of groups) {
      const passage = this.extractSharedPassage(group);

      for (const question of group) {
        this.questionDisplayText[question.questionId] = passage
          ? this.stripSharedPassage(question.questionText, passage)
          : question.questionText;
      }

      if (passage && group[0] && !this.questionPassages[group[0].questionId]) {
        this.questionPassages[group[0].questionId] = passage;
      }
    }

    this.extractRepeatedPassagesFromAdjacentQuestions();
  }

  private extractRepeatedPassagesFromAdjacentQuestions(): void {
    let index = 0;

    while (index < this.questions.length - 1) {
      let end = index + 1;
      let bestPassage: string | undefined;

      while (end < this.questions.length) {
        const group = this.questions.slice(index, end + 1);
        const passage = this.extractSharedPassageFromRepeatedText(group);
        if (!passage) break;

        bestPassage = passage;
        end++;
      }

      if (bestPassage) {
        const group = this.questions.slice(index, end);
        const firstQuestion = group[0];

        if (firstQuestion && !this.questionPassages[firstQuestion.questionId]) {
          this.questionPassages[firstQuestion.questionId] = bestPassage;
        }

        for (const question of group) {
          this.questionDisplayText[question.questionId] = this.stripSharedPassage(question.questionText, bestPassage);
        }

        index = end;
      } else {
        index++;
      }
    }
  }

  private groupConsecutiveQuestionsBySection(questions: Question[]): Question[][] {
    const groups: Question[][] = [];

    questions.forEach(question => {
      const currentGroup = groups[groups.length - 1];
      const currentSection = this.normalizeSection(currentGroup?.[0]?.section);
      const questionSection = this.normalizeSection(question.section);

      if (!currentGroup || currentSection !== questionSection) {
        groups.push([question]);
      } else {
        currentGroup.push(question);
      }
    });

    return groups;
  }

  private buildQuestionSections(): QuestionSection[] {
    return this.buildQuestionGroups().map(group => ({
      key: group.key,
      title: group.title,
      subtitle: `Câu ${group.questions[0].questionNumber} - ${group.questions[group.questions.length - 1].questionNumber}`,
      questions: group.questions,
    }));
  }

  private buildQuestionGroups(): { key: string; title: string; questions: Question[] }[] {
    const groups: { key: string; title: string; questions: Question[] }[] = [];

    for (const question of this.questions) {
      const key = this.getQuestionSectionKey(question);
      const currentGroup = groups[groups.length - 1];

      if (!currentGroup || currentGroup.key !== key) {
        groups.push({
          key,
          title: this.getQuestionSectionTitle(question),
          questions: [question],
        });
      } else {
        currentGroup.questions.push(question);
      }
    }

    return groups;
  }

  private getQuestionSectionKey(question: Question): string {
    const section = this.normalizeSection(question.section);
    if (section) return section;

    return this.getInferredQuestionType(question.questionNumber);
  }

  private getQuestionSectionTitle(question: Question): string {
    const section = (question.section || '').trim();
    if (section) return section;

    const labels: Record<string, string> = {
      pronunciation: 'Phần phát âm và trọng âm',
      grammar: 'Phần ngữ pháp và từ vựng',
      communication: 'Phần giao tiếp',
      synonym: 'Phần đồng nghĩa - trái nghĩa',
      cloze: 'Bài đọc 1 - Điền từ',
      reading: 'Bài đọc 2 - Đọc hiểu',
      rewrite: 'Phần viết lại câu',
      other: 'Phần câu hỏi khác',
    };

    return labels[this.getInferredQuestionType(question.questionNumber)] ?? labels['other'];
  }

  private getInferredQuestionType(questionNumber: number | null): string {
    const number = Number(questionNumber);

    if (number >= 1 && number <= 4) return 'pronunciation';
    if (number >= 5 && number <= 18) return 'grammar';
    if (number >= 19 && number <= 20) return 'communication';
    if (number >= 21 && number <= 24) return 'synonym';
    if (number >= 25 && number <= 30) return 'cloze';
    if (number >= 31 && number <= 34) return 'reading';
    if (number >= 35 && number <= 40) return 'rewrite';

    return 'other';
  }

  private normalizeSection(section?: string): string {
    return (section || '').trim().toLowerCase();
  }

  private extractSharedPassage(questions: Question[]): string | undefined {
    if (questions.length < 2) return undefined;

    const texts = questions.map(question => question.questionText || '').filter(Boolean);
    if (texts.length < 2) return undefined;

    const commonPrefix = this.getCommonPrefix(texts).trim();
    const looksLikeReading = this.isReadingSection(questions[0]?.section);

    if (!looksLikeReading && commonPrefix.length < 250) return undefined;
    if (commonPrefix.length < 120) return undefined;

    const safePrefix = this.trimToReadableBoundary(commonPrefix);
    return safePrefix.length >= 120 ? safePrefix : undefined;
  }

  private extractSharedPassageFromRepeatedText(questions: Question[]): string | undefined {
    if (questions.length < 2) return undefined;

    const texts = questions.map(question => question.questionText || '').filter(Boolean);
    if (texts.length < 2) return undefined;

    const commonPrefix = this.getCommonPrefix(texts).trim();
    if (commonPrefix.length < 120) return undefined;

    const safePrefix = this.trimToReadableBoundary(commonPrefix);
    return safePrefix.length >= 120 ? safePrefix : undefined;
  }

  private isReadingSection(section?: string): boolean {
    return /(reading|passage|đọc|doc|bài đọc|bai doc)/i.test(section || '');
  }

  private extractReadingOrdinal(text?: string): number | null {
    const value = (text || '').toLowerCase();
    const match = value.match(/(?:bài\s*đọc|bai\s*doc|reading|passage)\s*(\d+)/i);
    if (!match) return null;

    const ordinal = Number(match[1]);
    return Number.isFinite(ordinal) ? ordinal : null;
  }

  private inferStandalonePassageOrdinal(passage: Question): number | null {
    const passageNumber = Number(passage.questionNumber);

    if (!this.looksLikePassage(passage.questionText)) return null;
    if (!Number.isFinite(passageNumber)) return null;

    return passageNumber > 0 && passageNumber <= 5 ? passageNumber : null;
  }

  private looksLikePassage(text?: string): boolean {
    const value = (text || '').trim();
    return value.length >= 120 || /(read the passage|đọc đoạn văn|bài đọc|passage)/i.test(value);
  }

  private getCommonPrefix(texts: string[]): string {
    let prefix = texts[0];

    for (const text of texts.slice(1)) {
      let index = 0;
      while (index < prefix.length && index < text.length && prefix[index] === text[index]) {
        index++;
      }
      prefix = prefix.slice(0, index);
      if (!prefix) break;
    }

    return prefix;
  }

  private trimToReadableBoundary(text: string): string {
    const boundaries = ['</p>', '<br>', '<br/>', '<br />', '\n\n', '\n', '. ', '? ', '! '];
    let boundaryIndex = -1;
    let boundaryLength = 0;

    boundaries.forEach(boundary => {
      const index = text.lastIndexOf(boundary);
      if (index > boundaryIndex) {
        boundaryIndex = index;
        boundaryLength = boundary.length;
      }
    });

    if (boundaryIndex < 120) return text.trim();
    return text.slice(0, boundaryIndex + boundaryLength).trim();
  }

  private stripSharedPassage(questionText: string, passage: string): string {
    const stripped = questionText.startsWith(passage)
      ? questionText.slice(passage.length).trim()
      : questionText.replace(passage, '').trim();

    return stripped || questionText;
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