import { Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "dashboard" },
  {
    path: "dashboard",
    title: "Harsh-Boss · Dashboard",
    loadComponent: () =>
      import("./features/dashboard/dashboard.component").then(
        (m) => m.DashboardComponent
      )
  },
  {
    path: "inbox",
    title: "Harsh-Boss · Inbox",
    loadComponent: () =>
      import("./features/inbox/inbox.component").then((m) => m.InboxComponent)
  },
  {
    path: "important",
    title: "Harsh-Boss · Important Emails",
    loadComponent: () =>
      import("./features/important-emails/important-emails.component").then(
        (m) => m.ImportantEmailsComponent
      )
  },
  {
    path: "tasks",
    title: "Harsh-Boss · Tasks",
    loadComponent: () =>
      import("./features/tasks/tasks.component").then((m) => m.TasksComponent)
  },
  {
    path: "contacts",
    title: "Harsh-Boss · Contacts",
    loadComponent: () =>
      import("./features/contacts/contacts.component").then((m) => m.ContactsComponent)
  },
  {
    path: "jobs",
    title: "Harsh-Boss · Job Finder",
    loadComponent: () =>
      import("./features/jobs/jobs.component").then((m) => m.JobsComponent)
  },
  {
    path: "portals",
    title: "Harsh-Boss · Job Portals",
    loadComponent: () =>
      import("./features/job-portals/job-portals.component").then((m) => m.JobPortalsComponent)
  },
  {
    path: "interview",
    title: "Harsh-Boss · AI Interviewer",
    loadComponent: () =>
      import("./features/interview/interview.component").then((m) => m.InterviewComponent)
  },
  {
    path: "calendar",
    title: "Harsh-Boss · Calendar",
    loadComponent: () =>
      import("./features/calendar/calendar.component").then(
        (m) => m.CalendarComponent
      )
  },
  {
    path: "approvals",
    title: "Harsh-Boss · Approvals",
    loadComponent: () =>
      import("./features/approvals/approvals.component").then(
        (m) => m.ApprovalsComponent
      )
  },
  {
    path: "profile",
    title: "Harsh-Boss · Profile",
    loadComponent: () =>
      import("./features/profile/profile.component").then(
        (m) => m.ProfileComponent
      )
  },
  {
    path: "agent",
    title: "Harsh-Boss · AI Agent",
    loadComponent: () =>
      import("./features/agent/agent-chat.component").then(
        (m) => m.AgentChatComponent
      )
  },
  {
    path: "oauth-callback",
    title: "Harsh-Boss · Connecting…",
    loadComponent: () =>
      import("./features/oauth-callback/oauth-callback.component").then(
        (m) => m.OauthCallbackComponent
      )
  },
  { path: "**", redirectTo: "dashboard" }
];
