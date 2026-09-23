import {
  ApplicationConfig,
  provideZoneChangeDetection
} from "@angular/core";
import { provideRouter, withInMemoryScrolling } from "@angular/router";
import {
  provideHttpClient,
  withInterceptors,
  withFetch
} from "@angular/common/http";
import { provideAnimations } from "@angular/platform-browser/animations";
import { routes } from "./app.routes";
import { authInterceptor } from "./core/interceptors/auth.interceptor";
import { loadingInterceptor } from "./core/interceptors/loading.interceptor";

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: "top" })
    ),
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor, loadingInterceptor])
    ),
    provideAnimations()
  ]
};
