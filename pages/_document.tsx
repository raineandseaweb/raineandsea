import { Head, Html, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en" className="dark" data-theme="forest">
      <Head>
        <title>RaineAndSea</title>
        <link rel="stylesheet" href="/styles.css" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.documentElement.setAttribute('data-theme', 'forest');
              document.documentElement.classList.add('dark');
            `,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
