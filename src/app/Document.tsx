import styles from "./styles.css?url";


export const Document: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <html lang="en">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta
        httpEquiv="Content-Security-Policy"
        content="default-src 'self'; img-src 'self' https://authjs.dev data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
      />
      <title>@redwoodjs/auth-starter</title>
      <link rel="modulepreload" href="/src/client.tsx" as="script" />
      <link rel="stylesheet" href={styles} />
    </head>
    <body>
      <div id="root">{children}</div>
      <script>import("/src/client.tsx")</script>
    </body>
  </html>
);
