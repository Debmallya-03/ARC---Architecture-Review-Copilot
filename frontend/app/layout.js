import './globals.css';

export const metadata = {
  title: 'ARC - Architecture Review Copilot',
  description: 'Analyze repositories and generate visual architecture reports.'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
