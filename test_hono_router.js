// Quick Hono Router Test
// Replace line 18-19 in src/index.tsx temporarily:

/* 
// BEFORE (complex JSX):
app.get('/', (c) => {
  return c.render(
    <html lang="th">...

// AFTER (simple test):
app.get('/', (c) => {
  return c.text('TEST OK - Hono Router Working')
})
*/

// After change:
// 1. npm run build
// 2. npm run dev:sandbox  
// 3. curl http://localhost:3000/
// Expected: "TEST OK - Hono Router Working"