import { Component, inject, signal, ChangeDetectionStrategy, ElementRef, ViewChild, AfterViewChecked } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { HttpClient } from "@angular/common/http";
import { ToastService } from "../../core/services/toast.service";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatResponse {
  response: string;
}

/**
 * Agent chat component — a conversational AI interface where the user asks
 * free-text questions and the Spring AI ChatClient agent autonomously calls
 * tools (fetchEmails, findBuriedImportantEmails, checkCalendarConflict,
 * findFreeSlots) to answer.
 *
 * Examples:
 *  • "What important emails do I have?"
 *  • "Find emails buried in my spam folder"
 *  • "Am I free tomorrow at 3pm for a 30-min meeting?"
 *  • "Suggest 3 free slots this week"
 */
@Component({
  selector: "hb-agent-chat",
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col h-full max-h-[calc(100vh-12rem)]">
      <!-- Header -->
      <div class="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
        <span class="grid place-items-center h-8 w-8 rounded-lg bg-emerald-600 text-white">
          <svg viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </span>
        <div>
          <h2 class="text-sm font-semibold text-slate-900 dark:text-slate-100">Ask Harsh-Boss</h2>
          <p class="text-xs text-slate-400">AI agent with access to your real inbox + calendar</p>
        </div>
        @if (messages().length > 0) {
          <button
            type="button"
            (click)="clear()"
            class="ml-auto text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            Clear
          </button>
        }
      </div>

      <!-- Messages -->
      <div #scrollContainer class="flex-1 overflow-y-auto py-4 space-y-4 min-h-0">
        @if (messages().length === 0) {
          <div class="text-center py-8 space-y-3">
            <p class="text-sm text-slate-400">Try asking:</p>
            <div class="flex flex-col gap-2 max-w-sm mx-auto">
              @for (s of suggestions; track s) {
                <button
                  type="button"
                  (click)="ask(s)"
                  class="text-left px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 transition-colors"
                >
                  {{ s }}
                </button>
              }
            </div>
          </div>
        }

        @for (msg of messages(); track msg.timestamp) {
          <div [class]="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
            <div
              [class]="msg.role === 'user'
                ? 'max-w-[80%] rounded-2xl rounded-tr-sm bg-emerald-600 text-white px-4 py-2.5 text-sm'
                : 'max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-2.5 text-sm'"
            >
              <p class="whitespace-pre-wrap">{{ msg.content }}</p>
            </div>
          </div>
        }

        @if (thinking()) {
          <div class="flex justify-start">
            <div class="rounded-2xl rounded-tl-sm bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm text-slate-400">
              <span class="inline-flex items-center gap-1">
                Harsh-Boss is thinking
                <span class="flex gap-0.5">
                  <span class="animate-bounce" style="animation-delay: 0ms">.</span>
                  <span class="animate-bounce" style="animation-delay: 150ms">.</span>
                  <span class="animate-bounce" style="animation-delay: 300ms">.</span>
                </span>
              </span>
            </div>
          </div>
        }
      </div>

      <!-- Input -->
      <div class="pt-3 border-t border-slate-200 dark:border-slate-800">
        <form (ngSubmit)="send()" class="flex gap-2">
          <input
            #inputField
            type="text"
            [(ngModel)]="input"
            name="message"
            placeholder="Ask about your emails or calendar…"
            [disabled]="thinking()"
            class="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition disabled:opacity-50"
          />
          <button
            type="submit"
            [disabled]="thinking() || !input.trim()"
            class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            @if (thinking()) {
              <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-opacity="0.25" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
              </svg>
            } @else {
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            }
          </button>
        </form>
        <p class="text-[10px] text-slate-400 mt-1.5">
          The agent calls tools (fetchEmails, findBuriedImportant, checkConflict) autonomously.
        </p>
      </div>
    </div>
  `
})
export class AgentChatComponent implements AfterViewChecked {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  readonly messages = signal<ChatMessage[]>([]);
  readonly input = signal<string>("");
  readonly thinking = signal<boolean>(false);

  @ViewChild("scrollContainer") scrollContainer?: ElementRef<HTMLDivElement>;
  @ViewChild("inputField") inputField?: ElementRef<HTMLInputElement>;

  readonly suggestions = [
    "What important emails do I have?",
    "Find emails buried in my spam folder",
    "Am I free tomorrow at 3pm for 30 minutes?",
    "Suggest 3 free slots this week"
  ];

  private shouldScroll = false;

  ask(question: string): void {
    this.input.set(question);
    this.send();
  }

  send(): void {
    const text = this.input().trim();
    if (!text || this.thinking()) return;

    // Add user message
    this.messages.update(msgs => [...msgs, { role: "user", content: text, timestamp: new Date() }]);
    this.input.set("");
    this.thinking.set(true);
    this.shouldScroll = true;

    // Call the backend agent
    this.http.post<AgentChatResponse>("/api/agent/chat", { message: text }).subscribe({
      next: (resp) => {
        this.messages.update(msgs => [...msgs, {
          role: "assistant",
          content: resp.response || "(no response)",
          timestamp: new Date()
        }]);
        this.thinking.set(false);
        this.shouldScroll = true;
      },
      error: (err) => {
        this.thinking.set(false);
        const msg = err?.error?.message || err?.message || "The agent could not respond. Make sure emails are synced.";
        this.messages.update(msgs => [...msgs, {
          role: "assistant",
          content: "⚠️ " + msg,
          timestamp: new Date()
        }]);
        this.toast.error("Agent request failed");
        this.shouldScroll = true;
      }
    });
  }

  clear(): void {
    this.messages.set([]);
    this.http.post("/api/agent/clear", {}).subscribe();
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      this.shouldScroll = false;
    }
  }
}
