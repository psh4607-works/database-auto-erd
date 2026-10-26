import type { Metadata } from 'next'
import type React from 'react'
import './globals.css'
import { ToastProvider } from '@liam-hq/ui'
import { GoogleTagManager } from '@next/third-parties/google'
import { GTM_ID, GTMConsent, GtagScript } from '../libs/gtm'

const imageUrl = '/assets/liam_erd.png'

export const metadata: Metadata = {
  title: 'database-auto-erd',
  description: 'A local PostgreSQL schema workspace with persistent diagrams.',
  openGraph: {
    siteName: 'Liam',
    type: 'website',
    locale: 'en_US',
    images: imageUrl,
  },
  twitter: {},
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      {process.env.ERD_LOCAL_ONLY !== '1' && (
        <>
          <GoogleTagManager
            gtmId={GTM_ID}
            dataLayer={{ appEnv: process.env.NEXT_PUBLIC_ENV_NAME ?? '' }}
          />
          <GtagScript />
          <GTMConsent />
        </>
      )}
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  )
}
