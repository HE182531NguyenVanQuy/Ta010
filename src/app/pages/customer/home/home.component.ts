import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass, CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ExamService } from '../../../services/exam.service';
import { SignalrService, LeaderboardItem } from '../../../services/signalr.service';

interface ExamCard {
  id: string;
  title: string;
  questions: number;
  duration: number;
  views: string;
  progress: number;
  difficulty: string;
  difficultyClass: string;
  action: string;
  cover: string;
  tag: string;
  tagClass: string;
}

interface BlogItem {
  id: string;
  title: string;
  meta: string;
  emoji: string;
  thumbClass: string;
}

interface ScheduleItem {
  day: string;
  month: string;
  title: string;
  time: string;
  bgClass: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  desc: string;
}

interface TestimonialItem {
  text: string;
  name: string;
  meta: string;
  initial: string;
  avatarBg: string;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, NgClass, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private examService = inject(ExamService);
  private signalrService = inject(SignalrService);

  private leaderboardSub: Subscription | null = null;

  examCards: ExamCard[] = [];
  blogItems: BlogItem[] = [];

  // Static/Config sections
  topics = [
    { name: 'Thì động từ', count: '12 chủ điểm · 240 bài', emoji: '⏰' },
    { name: 'Câu bị động', count: '8 chủ điểm · 160 bài', emoji: '🔄' },
    { name: 'Câu gián tiếp', count: '6 chủ điểm · 120 bài', emoji: '💬' },
    { name: 'Câu điều kiện', count: '4 chủ điểm · 80 bài', emoji: '❓' },
    { name: 'Mệnh đề quan hệ', count: '5 chủ điểm · 100 bài', emoji: '📖' },
    { name: 'Liên từ & Giới từ', count: '9 chủ điểm · 180 bài', emoji: '🔗' },
    { name: 'Từ loại & Cấu tạo từ', count: '10 chủ điểm · 200 bài', emoji: '📝' },
    { name: 'Kỹ năng đọc hiểu', count: '15 chủ điểm · 300 bài', emoji: '🗣️' },
  ];

  leaderboard = [
    { rank: '🏆', rankClass: 'rank-1', name: 'Nguyễn Minh Anh', score: 'Hà Nội · 48 bài', points: '9,850', initial: 'N', avatarBg: 'linear-gradient(135deg,#0ea5e9,#38bdf8)' },
    { rank: '🥈', rankClass: 'rank-2', name: 'Trần Thị Lan', score: 'TP.HCM · 45 bài', points: '9,420', initial: 'T', avatarBg: 'linear-gradient(135deg,#10b981,#34d399)' },
    { rank: '🥉', rankClass: 'rank-3', name: 'Lê Hoàng Nam', score: 'Đà Nẵng · 42 bài', points: '9,110', initial: 'L', avatarBg: 'linear-gradient(135deg,#f59e0b,#fcd34d)' },
    { rank: '4', rankClass: 'rank-other', name: 'Phạm Thu Hà', score: 'Huế · 38 bài', points: '8,760', initial: 'P', avatarBg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
    { rank: '5', rankClass: 'rank-other', name: 'Vũ Đức Hùng', score: 'Hải Phòng · 36 bài', points: '8,300', initial: 'V', avatarBg: 'linear-gradient(135deg,#ec4899,#f9a8d4)' },
  ];

  schedule: ScheduleItem[] = [
    { day: '20', month: 'T5/26', title: 'Thi thử toàn quốc đợt 1', time: '⏰ 8:00 – 10:00 sáng', bgClass: 'schedule-sky' },
    { day: '05', month: 'T6/26', title: 'Thi thử TP.Hà Nội 2026', time: '⏰ 14:00 – 16:00 chiều', bgClass: 'schedule-amber' },
    { day: '05', month: 'T7/26', title: 'Kỳ thi chính thức Hà Nội', time: '⏰ 7:30 – 9:30 sáng', bgClass: 'schedule-green' },
  ];

  features: FeatureItem[] = [
    { icon: '🤖', title: 'AI Phân tích điểm yếu', desc: 'Hệ thống AI thông minh phân tích kết quả và đề xuất chủ điểm cần cải thiện phù hợp với từng học sinh.' },
    { icon: '⏱️', title: 'Mô phỏng thi thật', desc: 'Giao diện thi giống hệt phòng thi thực tế, đếm ngược thời gian chính xác từng giây.' },
    { icon: '📊', title: 'Báo cáo chi tiết', desc: 'Theo dõi tiến độ học tập qua biểu đồ trực quan, thống kê từng loại câu hỏi và chủ điểm.' },
    { icon: '💬', title: 'Giải thích từng câu', desc: 'Mỗi đáp án đều có giải thích chi tiết, ví dụ minh họa và kiến thức ngữ pháp liên quan.' },
    { icon: '📱', title: 'Học mọi thiết bị', desc: 'Tương thích hoàn hảo trên điện thoại, máy tính bảng và máy tính. Học offline dễ dàng.' },
    { icon: '👥', title: 'Cộng đồng học tập', desc: 'Đặt câu hỏi, chia sẻ tài liệu và giao lưu với hàng triệu học sinh trên toàn quốc.' },
  ];

  testimonials: TestimonialItem[] = [
    { text: 'Nhờ TaO10 mình đã tăng từ 6.5 lên 9.0 trong kỳ thi thật! Hệ thống đề thi rất đầy đủ, giải thích chi tiết và dễ hiểu.', name: 'Nguyễn Minh Châu', meta: 'Học sinh lớp 9 – Hà Nội', initial: 'M', avatarBg: 'linear-gradient(135deg,#0ea5e9,#7dd3fc)' },
    { text: 'Website có giao diện đẹp, dễ dùng. Mình thích nhất tính năng thi thử mô phỏng phòng thi thực tế, giúp mình bớt hồi hộp khi thi thật.', name: 'Trần Bảo Trân', meta: 'Học sinh lớp 9 – TP.HCM', initial: 'T', avatarBg: 'linear-gradient(135deg,#10b981,#34d399)' },
    { text: 'Bộ chuyên đề ngữ pháp rất có hệ thống. Mình ôn trong 2 tháng và đạt 8.5 điểm thi vào lớp 10 chuyên Anh!', name: 'Lê Khánh Huyền', meta: 'Học sinh lớp 9 – Đà Nẵng', initial: 'H', avatarBg: 'linear-gradient(135deg,#8b5cf6,#a78bfa)' },
  ];

  ngOnInit(): void {
    // 1. Start SignalR Connection
    this.signalrService.startConnection();

    // 2. Load Real Exams List (6 items)
    this.loadExams();

    // 4. Listen to SignalR dynamic leaderboard updates
    this.leaderboardSub = this.signalrService.leaderboard$.subscribe({
      next: (data: LeaderboardItem[]) => {
        this.updateLeaderboardUI(data);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.leaderboardSub) {
      this.leaderboardSub.unsubscribe();
    }
  }

  private loadExams(): void {
    this.examService.getExams('', undefined, '', '', 1, 6).subscribe({
      next: (exams) => {
        if (exams && exams.length > 0) {
          this.examCards = exams.map(e => ({
            id: e.examId,
            title: e.title,
            questions: e.questionsCount ?? 0,
            duration: e.durationTime,
            views: `${(e.viewsCount ?? 0) >= 1000 ? ((e.viewsCount ?? 0) / 1000).toFixed(1) + 'k' : e.viewsCount} lượt`,
            progress: e.progressPercentage ?? 0,
            difficulty: e.level ?? 'Trung bình',
            difficultyClass: e.level === 'Khó' ? 'diff-hard' : e.level === 'Dễ' ? 'diff-easy' : 'diff-medium',
            action: e.progressPercentage === 100 ? 'Xem KQ →' : e.progressPercentage ? 'Tiếp tục →' : 'Làm bài →',
            cover: this.getRandomCoverClass(e.examId),
            tag: e.isPremium ? '🔥 Premium' : 'Miễn phí',
            tagClass: e.isPremium ? 'tag-hot' : 'tag-free'
          }));
        }
      },
      error: (err) => {
        console.error('Failed to load exams from API, using static mock data.', err);
      }
    });
  }

  

  private updateLeaderboardUI(data: LeaderboardItem[]): void {
    if (!data || data.length === 0) return;
    this.leaderboard = data.map((item, idx) => ({
      rank: idx === 0 ? '🏆' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1).toString(),
      rankClass: idx < 3 ? `rank-${idx + 1}` : 'rank-other',
      name: item.name,
      score: item.score,
      points: item.points,
      initial: item.initial,
      avatarBg: idx === 0 ? 'linear-gradient(135deg,#0ea5e9,#38bdf8)' : 
               idx === 1 ? 'linear-gradient(135deg,#10b981,#34d399)' :
               idx === 2 ? 'linear-gradient(135deg,#f59e0b,#fcd34d)' :
               idx === 3 ? 'linear-gradient(135deg,#8b5cf6,#a78bfa)' :
               'linear-gradient(135deg,#ec4899,#f9a8d4)'
    }));
  }

  private getRandomCoverClass(id: string): string {
    const covers = ['cover-blue', 'cover-sky', 'cover-teal', 'cover-indigo', 'cover-emerald', 'cover-violet'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % covers.length;
    return covers[index];
  }
}
