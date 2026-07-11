import { ScrollViewStyleReset } from "expo-router/html";
import React from "react";

// Custom root HTML template for Expo Router web builds.
// This is only rendered on the web during static export.
export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />

        {/* Link the PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* iOS-specific PWA meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="Ojam" />
        <link rel="apple-touch-icon" href="/logo192.png" />

        {/* Web Reset styles */}
        <ScrollViewStyleReset />

        {/* Splash screen styles and Service Worker registration */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          body {
            background-color: #151718;
          }
          #pwa-splash-screen {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: #151718;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            transition: opacity 0.4s ease-out;
          }
          .splash-logo {
            width: 120px;
            height: 120px;
            object-fit: contain;
            border-radius: 28px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.4);
            animation: pulse 2s infinite ease-in-out;
          }
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.95; }
            50% { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(1); opacity: 0.95; }
          }
        `,
          }}
        />

        <script
          dangerouslySetInnerHTML={{
            __html: `
          // Register PWA service worker
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
                .then((reg) => console.log('PWA Service Worker registered successfully', reg.scope))
                .catch((err) => console.warn('PWA Service Worker registration failed', err));
            });
          }

          // Fade out and remove the splash screen once JS is parsed and app has booted
          window.addEventListener('DOMContentLoaded', () => {
            // Give it a brief delay so the initial layout render completes smoothly
            setTimeout(() => {
              const splash = document.getElementById('pwa-splash-screen');
              if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 400);
              }
            }, 800);
          });
        `,
          }}
        />
      </head>
      <body>
        {/* Instant CSS Splash Screen */}
        <div id="pwa-splash-screen">
          <img src="/logo192.png" className="splash-logo" alt="Ojam Logo" />
        </div>
        {children}
      </body>
    </html>
  );
}
