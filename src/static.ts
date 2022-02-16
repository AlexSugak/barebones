
export function renderMarkup(
  body: string, 
  options: {
    includeIsServerRendered: boolean
  } = {includeIsServerRendered: false}): string {
  return `<!DOCTYPE html>
<html lang="en" class="text-gray-900 leading-tight">
    <head>
        <title>Bare Bones App</title>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/tailwind.css" rel="stylesheet">
    </head>
    <body class="min-h-screen bg-gray-100">
        <div id="app">${body}</div>
        ${options.includeIsServerRendered ? `<script>window.isServerRendered = true</script>` : ``}
        <script type="module" src="/js/index.js"></script>
    </body>
</html>
  `
}

export function renderLoader(): string {
  return `Loading...`
}
