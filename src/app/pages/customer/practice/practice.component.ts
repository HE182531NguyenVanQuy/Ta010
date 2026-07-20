import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PaymentService } from '../../../services/payment.service';
import {
  QuestionCatalogItem,
  QuestionCatalogService,
} from '../../../services/question-catalog.service';

interface QuestionSection {
  title: string;
  subtitle: string;
  questions: QuestionCatalogItem[];
}

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './practice.component.html',
  styleUrls: ['../test/test.component.scss', './practice.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PracticeComponent implements OnInit {
  type = '';
  totalAvailable = 0;
  questions: QuestionCatalogItem[] = [];
  questionSections: QuestionSection[] = [];
  loading = true;
  errorMessage = '';

  userAnswers: Record<string, string> = {};
  explVisible: Record<string, boolean> = {};

  constructor(
    private route: ActivatedRoute,
    private questionCatalogService: QuestionCatalogService,
    private paymentService: PaymentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.type = params.get('type') ?? '';
      this.checkAccessAndLoad();
    });
  }

  private checkAccessAndLoad(): void {
    this.loading = true;
    this.paymentService.getMyPackage().subscribe({
      next: (userPackage) => {
        if (!userPackage?.isActive || (userPackage.durationTime ?? 0) < 90) {
          this.loading = false;
          this.errorMessage = 'Luyện tập yêu cầu gói từ 3 tháng trở lên.';
          this.cdr.markForCheck();
          return;
        }
        this.loadPractice();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'Bạn cần đăng nhập và sở hữu gói từ 3 tháng trở lên để luyện tập.';
        this.cdr.markForCheck();
      }
    });
  }

  loadPractice(): void {
    if (!this.type) {
      this.loading = false;
      this.errorMessage = 'Thiếu type câu hỏi để luyện tập.';
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.userAnswers = {};
    this.explVisible = {};
    this.cdr.markForCheck();

    this.questionCatalogService.getPracticeQuestions(this.type, 10).subscribe({
      next: (response) => {
        this.totalAvailable = response.totalAvailable ?? 0;
        this.questions = response.questions ?? [];
        this.questions.forEach((question) => {
          this.explVisible[question.questionId] = false;
        });
        this.questionSections = [
          {
            title: this.type,
            subtitle: `Random ${this.questions.length} / ${this.totalAvailable} câu trong database`,
            questions: this.questions,
          },
        ];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Failed to load practice questions:', error);
        this.questions = [];
        this.questionSections = [];
        this.errorMessage = 'Không tải được câu hỏi luyện tập. Vui lòng thử lại.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  resetPractice(): void {
    this.loadPractice();
  }

  selectOpt(questionId: string, option: string): void {
    this.userAnswers[questionId] = option;
    this.explVisible[questionId] = true;
    this.cdr.markForCheck();
  }

  get totalQuestions(): number {
    return this.questions.length;
  }

  get answeredCount(): number {
    return Object.keys(this.userAnswers).length;
  }

  get correctCount(): number {
    return this.questions.filter((question) => this.isQuestionCorrect(question)).length;
  }

  get remainCount(): number {
    return this.totalQuestions - this.answeredCount;
  }

  get progressPct(): string {
    return this.totalQuestions ? `${Math.round((this.answeredCount / this.totalQuestions) * 100)}%` : '0%';
  }

  get progressWidth(): string {
    return this.progressPct;
  }

  getOptionLetter(index: number): string {
    return String.fromCharCode(65 + index);
  }

  getQuestionOptions(question: QuestionCatalogItem): string[] {
    return [question.optionA, question.optionB, question.optionC, question.optionD]
      .filter((option): option is string => typeof option === 'string' && !!option.trim());
  }

  getCorrectAnswer(question: QuestionCatalogItem): string {
    return (question.correctAnswer ?? '').trim().toUpperCase();
  }

  isQuestionCorrect(question: QuestionCatalogItem): boolean {
    const selected = this.userAnswers[question.questionId];
    return !!selected && selected === this.getCorrectAnswer(question);
  }

  getOptionClass(question: QuestionCatalogItem, option: string): string {
    const selected = this.userAnswers[question.questionId];
    const correct = this.getCorrectAnswer(question);

    if (!selected) return '';
    if (option === correct) return selected === option ? 'correct' : 'reveal-correct';
    if (selected === option) return 'wrong';
    return '';
  }

  getQNumClass(questionId: string): string {
    const question = this.questions.find((item) => item.questionId === questionId);
    if (!question || !this.userAnswers[questionId]) return '';
    return this.isQuestionCorrect(question) ? 'correct-q' : 'wrong-q';
  }

  getNavClass(question: QuestionCatalogItem): string {
    if (!this.userAnswers[question.questionId]) return '';
    return this.isQuestionCorrect(question) ? 'nav-correct' : 'nav-wrong';
  }

  getExplanationClass(question: QuestionCatalogItem): string {
    if (!this.userAnswers[question.questionId]) return '';
    return this.isQuestionCorrect(question) ? 'explanation-correct' : 'explanation-wrong';
  }

  scrollToQ(questionId: string): void {
    if (typeof document === 'undefined') return;

    document.getElementById(`q${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}
