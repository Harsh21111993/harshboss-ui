import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { InterviewService, SubmitAnswerResult, WeaknessItem, InterviewHistoryItem } from "../../core/services/interview.service";
import { UserService } from "../../core/services/user.service";
import { ToastService } from "../../core/services/toast.service";
import { Router } from "@angular/router";

/**
 * InterviewComponent — AI Voice Interviewer.
 *
 * Flow:
 *  1. User clicks "Start Interview" → backend generates first question from resume
 *  2. The interviewer's question is spoken via TTS (OpenAI voice)
 *  3. User clicks "Record Answer" → mic captures audio → Deepgram STT transcribes
 *  4. Transcript is sent to backend → Gemini evaluates + Jev scores → next question
 *  5. After 10 questions → session completes with summary + weakness analysis
 *
 * If Deepgram/mic is not available, user can type answers as fallback.
 */
@Component({
  selector: "hb-interview",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 class="text-xl sm:text-2xl font-semibold text-slate-900 dark:text-slate-100">AI Voice Interviewer</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Real-time voice interview adapted to your resume. Get scored, track weaknesses, improve.
        </p>
      </header>

      <!-- No resume CTA -->
      @if (!interviewActive() && !sessionComplete() && !hasResume()) {
        <div class="p-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 text-center space-y-4">
          <span class="text-5xl">🎙️</span>
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Upload your resume first</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              The interviewer generates questions based on your tech stack (skills, frameworks, experience).
            </p>
          </div>
          <button type="button" (click)="goToProfile()"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
            Go to Profile →
          </button>
        </div>
      }

      <!-- Start interview -->
      @if (hasResume() && !interviewActive() && !sessionComplete()) {
        <div class="p-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-4">
          <span class="text-5xl">🎙️</span>
          <div>
            <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Ready for your interview?</h3>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">
              10 questions based on your resume. Voice or text — your choice.
            </p>
          </div>
          <button type="button" (click)="startInterview()" [disabled]="loading()"
            class="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 mx-auto">
            @if (loading()) {
              <svg class="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" /><path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" /></svg>
              Starting...
            } @else { 🎙️ Start Interview }
          </button>
        </div>
      }

      <!-- Active interview -->
      @if (interviewActive()) {
        <div class="space-y-4">
          <!-- Question counter -->
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-slate-500">Question {{ currentQuestionNumber() }} of 10</span>
            <span class="text-xs text-slate-400">Score: {{ currentScore() }}/5 avg</span>
          </div>

          <!-- Progress bar -->
          <div class="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-emerald-600 transition-all duration-500" [style.width.%]="(currentQuestionNumber() / 10) * 100"></div>
          </div>

          <!-- Current question -->
          <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div class="flex items-start gap-3">
              <span class="text-2xl shrink-0">🤖</span>
              <div class="flex-1">
                <div class="text-xs text-slate-400 mb-1">Interviewer asks:</div>
                <p class="text-sm text-slate-900 dark:text-slate-100">{{ currentQuestion() }}</p>
              </div>
              <button type="button" (click)="speakQuestion()" [disabled]="speaking()"
                class="shrink-0 px-2 py-1 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50">
                @if (speaking()) { 🔊... } @else { 🔊 Speak }
              </button>
            </div>
          </div>

          <!-- Answer input -->
          <div class="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-xs text-slate-400">Your answer:</span>
              <div class="flex gap-2">
                <button type="button" (click)="toggleRecording()" [class]="recording() ? 'px-3 py-1 rounded text-xs bg-rose-600 text-white animate-pulse' : 'px-3 py-1 rounded text-xs border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'">
                  @if (recording()) { ⏹ Stop Recording } @else { 🎤 Record Voice }
                </button>
              </div>
            </div>

            <!-- Live transcript -->
            @if (recording()) {
              <div class="p-3 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
                <div class="text-xs text-rose-500 mb-1 flex items-center gap-1">
                  <span class="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span> Listening...
                </div>
                <p class="text-sm text-slate-700 dark:text-slate-300">{{ liveTranscript() || 'Start speaking...' }}</p>
              </div>
            }

            <!-- Text fallback -->
            <textarea
              [(ngModel)]="typedAnswer"
              rows="4"
              placeholder="Type your answer here (or use voice recording above)..."
              class="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm resize-y focus:ring-2 focus:ring-emerald-500 outline-none"
            ></textarea>

            <button type="button" (click)="submitAnswer()" [disabled]="submitting() || (!typedAnswer.trim() && !liveTranscript())"
              class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium">
              @if (submitting()) { Evaluating... } @else { Submit Answer → }
            </button>
          </div>

          <!-- Last evaluation -->
          @if (lastEvaluation()) {
            <div class="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-emerald-700 dark:text-emerald-400">Evaluation</span>
                <span class="text-xs px-2 py-0.5 rounded {{ lastEvaluation()!.jevPassFail === 'PASS' ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300' }}">
                  {{ lastEvaluation()!.jevPassFail }}
                </span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-center">
                <div class="p-2 rounded bg-white dark:bg-slate-800">
                  <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ lastEvaluation()!.knowledgeScore }}/5</div>
                  <div class="text-[10px] text-slate-400">Knowledge</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-slate-800">
                  <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ lastEvaluation()!.communicationScore }}/5</div>
                  <div class="text-[10px] text-slate-400">Communication</div>
                </div>
                <div class="p-2 rounded bg-white dark:bg-slate-800">
                  <div class="text-lg font-bold text-slate-900 dark:text-slate-100">{{ lastEvaluation()!.problemSolvingScore }}/5</div>
                  <div class="text-[10px] text-slate-400">Problem Solving</div>
                </div>
              </div>
              @if (lastEvaluation()!.weaknessTopic && lastEvaluation()!.weaknessTopic !== 'none') {
                <div class="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ Weakness: {{ lastEvaluation()!.weaknessTopic }}
                </div>
              }
              <p class="text-xs text-slate-600 dark:text-slate-400">{{ lastEvaluation()!.feedback }}</p>
            </div>
          }
        </div>
      }

      <!-- Session complete -->
      @if (sessionComplete()) {
        <div class="p-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-4">
          <span class="text-5xl">🎉</span>
          <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-100">Interview Complete!</h3>
          <div class="text-3xl font-bold text-emerald-600">{{ finalScore() }}/5</div>
          <p class="text-xs text-slate-400">Average score across all questions</p>
          <button type="button" (click)="viewResults()"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">
            View Detailed Results →
          </button>
        </div>
      }

      <!-- Weakness analysis -->
      @if (weaknesses().length > 0) {
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Recurring Weaknesses</h3>
          @for (w of weaknesses(); track w.topic) {
            <div class="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-slate-900 dark:text-slate-100">{{ w.topic }}</span>
                <span class="text-xs px-2 py-0.5 rounded {{ w.avgScore <= 1.5 ? 'bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300' : 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' }}">
                  {{ w.avgScore }}/5 ({{ w.incidentCount }}x)
                </span>
              </div>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">{{ w.recommendation }}</p>
            </div>
          }
        </div>
      }

      <!-- Interview history -->
      @if (history().length > 0) {
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Past Interviews</h3>
          @for (h of history(); track h.sessionId) {
            <div class="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {{ h.startedAt | date:'MMM d, h:mm a' }} · {{ h.totalQuestions }} questions
                </div>
                <div class="text-xs text-slate-400">
                  @if (h.weaknessTags.length > 0) {
                    Weaknesses: {{ h.weaknessTags.join(', ') }}
                  } @else { No significant weaknesses detected }
                </div>
              </div>
              @if (h.overallScore) {
                <span class="text-lg font-bold {{ h.overallScore >= 3.5 ? 'text-emerald-600' : h.overallScore >= 2.5 ? 'text-amber-600' : 'text-rose-600' }}">
                  {{ h.overallScore }}/5
                </span>
              }
            </div>
          }
        </div>
      }
    </div>
  `
})
export class InterviewComponent implements OnInit {
  private readonly interviewSvc = inject(InterviewService);
  private readonly userSvc = inject(UserService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly speaking = signal(false);
  readonly recording = signal(false);
  readonly interviewActive = signal(false);
  readonly sessionComplete = signal(false);
  readonly hasResume = signal(false);

  readonly currentQuestion = signal("");
  readonly currentQuestionNumber = signal(0);
  readonly currentScore = signal(0);
  readonly lastEvaluation = signal<SubmitAnswerResult | null>(null);
  readonly finalScore = signal(0);

  readonly liveTranscript = signal("");
  readonly weaknesses = signal<WeaknessItem[]>([]);
  readonly history = signal<InterviewHistoryItem[]>([]);

  typedAnswer = "";
  private sessionId = "";
  private scores: number[] = [];
  private recognition: any = null;

  ngOnInit(): void {
    this.userSvc.getResumes().subscribe({
      next: (resumes) => this.hasResume.set(resumes && resumes.length > 0),
      error: () => this.hasResume.set(false)
    });
    this.loadHistory();
    this.loadWeaknesses();
  }

  startInterview(): void {
    this.loading.set(true);
    this.userSvc.getResumes().subscribe({
      next: (resumes) => {
        if (!resumes || resumes.length === 0) {
          this.toast.error("No resume found. Upload one in Profile.");
          this.loading.set(false);
          return;
        }
        const resumeId = resumes[0].id;
        this.interviewSvc.startInterview(resumeId).subscribe({
          next: (session) => {
            this.sessionId = session.sessionId;
            this.currentQuestion.set(session.firstQuestion);
            this.currentQuestionNumber.set(1);
            this.interviewActive.set(true);
            this.loading.set(false);
            this.scores = [];
            this.toast.success("Interview started!");
            // Auto-speak the first question
            setTimeout(() => this.speakQuestion(), 500);
          },
          error: () => {
            this.loading.set(false);
            this.toast.error("Could not start interview. Check your API keys.");
          }
        });
      },
      error: () => {
        this.loading.set(false);
        this.toast.error("Could not load resume.");
      }
    });
  }

  submitAnswer(): void {
    const answer = this.liveTranscript() || this.typedAnswer;
    if (!answer.trim()) return;

    this.submitting.set(true);
    this.stopRecording();

    this.interviewSvc.submitAnswer(this.sessionId, answer.trim()).subscribe({
      next: (result) => {
        this.lastEvaluation.set(result);

        // Track score
        const avgScore = (result.knowledgeScore + result.communicationScore + result.problemSolvingScore) / 3;
        this.scores.push(avgScore);
        const overallAvg = this.scores.reduce((a, b) => a + b, 0) / this.scores.length;
        this.currentScore.set(Number(overallAvg.toFixed(1)));

        if (result.interviewComplete) {
          this.finalScore.set(Number(overallAvg.toFixed(1)));
          this.interviewActive.set(false);
          this.sessionComplete.set(true);
          this.toast.success("Interview completed!");
          this.loadHistory();
          this.loadWeaknesses();
        } else {
          this.currentQuestion.set(result.nextQuestion);
          this.currentQuestionNumber.update(n => n + 1);
          this.typedAnswer = "";
          this.liveTranscript.set("");
          // Auto-speak the next question
          setTimeout(() => this.speakQuestion(), 500);
        }

        this.submitting.set(false);
      },
      error: () => {
        this.submitting.set(false);
        this.toast.error("Could not evaluate answer. Try again.");
      }
    });
  }

  speakQuestion(): void {
    const text = this.currentQuestion();
    if (!text) return;

    this.speaking.set(true);
    this.interviewSvc.generateSpeech(text).subscribe({
      next: (blob) => {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        audio.onended = () => {
          this.speaking.set(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          this.speaking.set(false);
          this.toast.error("Could not play interviewer voice.");
        };
        audio.play();
      },
      error: () => {
        this.speaking.set(false);
        this.toast.error("TTS failed. Check OpenAI API key.");
      }
    });
  }

  toggleRecording(): void {
    if (this.recording()) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  startRecording(): void {
    // Use Web Speech API as fallback (works in Chrome/Edge)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toast.warning("Voice recording not supported in this browser. Please type your answer.");
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = "en-US";

    let finalTranscript = "";

    this.recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      this.liveTranscript.set(finalTranscript + interim);
      if (finalTranscript) this.typedAnswer = finalTranscript;
    };

    this.recognition.onerror = (event: any) => {
      this.toast.error("Recording error: " + event.error);
      this.recording.set(false);
    };

    this.recognition.onend = () => {
      if (this.recording()) {
        // Restart if still recording (Web Speech API stops after pauses)
        try { this.recognition.start(); } catch (e) {}
      }
    };

    this.recognition.start();
    this.recording.set(true);
    this.liveTranscript.set("");
    this.toast.info("Recording started. Speak your answer.");
  }

  stopRecording(): void {
    if (this.recognition) {
      this.recording.set(false);
      try { this.recognition.stop(); } catch (e) {}
      this.recognition = null;
    }
  }

  loadHistory(): void {
    this.interviewSvc.getHistory().subscribe({
      next: (h) => this.history.set(h || []),
      error: () => {}
    });
  }

  loadWeaknesses(): void {
    this.interviewSvc.getWeaknesses().subscribe({
      next: (w) => this.weaknesses.set(w || []),
      error: () => {}
    });
  }

  viewResults(): void {
    this.sessionComplete.set(false);
    this.loadHistory();
    this.loadWeaknesses();
  }

  goToProfile(): void {
    this.router.navigateByUrl("/profile");
  }
}
