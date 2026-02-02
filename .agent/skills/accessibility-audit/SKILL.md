---
name: Accessibility Audit
description: WCAG 2.1 AA compliance guidelines and accessibility best practices for React applications.
---

# Accessibility Audit Guidelines

You are an expert accessibility engineer. When writing or reviewing React components, follow these WCAG 2.1 AA guidelines:

## Critical Rules

### 1. Semantic HTML
Always use the correct HTML elements:

```tsx
// ✅ Good - semantic elements
<nav>...</nav>
<main>...</main>
<article>...</article>
<button onClick={...}>Click me</button>

// ❌ Bad - div soup
<div className="nav">...</div>
<div onClick={...}>Click me</div>
```

### 2. Keyboard Navigation
All interactive elements must be keyboard accessible:

```tsx
// ✅ Good - focusable and has keyboard handler
<button onClick={handleClick} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
  Submit
</button>

// For custom components, manage focus
const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'ArrowDown':
      focusNextItem();
      break;
    case 'ArrowUp':
      focusPreviousItem();
      break;
    case 'Escape':
      closeMenu();
      break;
  }
};
```

### 3. ARIA Labels
Provide context for screen readers:

```tsx
// Icons without visible text
<button aria-label="ปิดหน้าต่าง">
  <X className="h-4 w-4" />
</button>

// Form inputs
<label htmlFor="email">อีเมล</label>
<input id="email" type="email" aria-describedby="email-hint" />
<span id="email-hint">ใช้อีเมล @rmu.ac.th เท่านั้น</span>

// Loading states
<div role="status" aria-live="polite">
  {loading ? "กำลังโหลด..." : `พบ ${count} รายการ`}
</div>
```

### 4. Color Contrast
Ensure sufficient contrast ratios:

```css
/* WCAG AA Requirements:
   - Normal text: 4.5:1 contrast ratio
   - Large text (18pt+): 3:1 contrast ratio
   - UI components: 3:1 contrast ratio */

/* ✅ Good */
.text-foreground { color: hsl(0 0% 10%); }  /* Dark on light */
.bg-background { background: hsl(0 0% 100%); }

/* ❌ Bad - low contrast */
.text-gray-400 { color: hsl(0 0% 60%); }  /* Gray on white = ~2.5:1 */
```

### 5. Focus Indicators
Never remove focus outlines without replacement:

```css
/* ✅ Good - custom focus indicator */
button:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ❌ Bad - removes focus entirely */
button:focus {
  outline: none;
}
```

### 6. Form Accessibility
```tsx
// Complete accessible form pattern
<form onSubmit={handleSubmit}>
  <div className="space-y-2">
    <Label htmlFor="title">
      ชื่อสิ่งของ <span className="text-destructive">*</span>
    </Label>
    <Input
      id="title"
      required
      aria-required="true"
      aria-invalid={!!errors.title}
      aria-describedby={errors.title ? "title-error" : undefined}
    />
    {errors.title && (
      <p id="title-error" role="alert" className="text-destructive text-sm">
        {errors.title}
      </p>
    )}
  </div>
</form>
```

### 7. Images & Media
```tsx
// Informative images need alt text
<Image src={item.imageUrl} alt={`รูปภาพของ ${item.title}`} />

// Decorative images use empty alt
<Image src="/pattern.svg" alt="" aria-hidden="true" />

// Videos need captions
<video controls>
  <source src="video.mp4" type="video/mp4" />
  <track kind="captions" src="captions-th.vtt" srcLang="th" label="Thai" />
</video>
```

### 8. Skip Links
Allow users to skip repetitive content:

```tsx
// Add at the top of your layout
<a 
  href="#main-content" 
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:p-4"
>
  ข้ามไปยังเนื้อหาหลัก
</a>

// Main content target
<main id="main-content" tabIndex={-1}>
  ...
</main>
```

### 9. Motion & Animation
Respect user preferences:

```tsx
// Check for reduced motion preference
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// In CSS
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Accessibility Checklist
- [ ] All images have appropriate alt text
- [ ] Forms have proper labels and error messages
- [ ] Color contrast meets WCAG AA (4.5:1 for text)
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] ARIA labels provided for icon-only buttons
- [ ] `role="status"` and `aria-live` for dynamic content
- [ ] Skip link for navigation
- [ ] Reduced motion respected
- [ ] Page language set (`<html lang="th">`)
