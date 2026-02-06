---
name: slidev-converter
description: Convert standard Markdown to Slidev format for creating presentations. Use this skill when users want to transform markdown notes, articles, or documents into Slidev presentation format, or when they ask to create slides from markdown content.
---

# Slidev Converter

## Overview

Convert standard Markdown documents into Slidev presentation format. Slidev is a developer-focused presentation tool that uses Markdown with special syntax for slides, layouts, and interactivity.

## When to Use

Trigger this skill when users ask to:
- "Convert markdown to slides" or "Turn markdown into a presentation"
- "Create Slidev from markdown" or "Transform notes to Slidev format"
- "Make a presentation from this markdown"
- "Format this as Slidev"

Do NOT use for:
- Converting to PowerPoint, Keynote, or other slide formats (use pptx skill instead)
- General markdown formatting questions

## Core Conversion Rules

### 1. Page Separation

Use `---` to separate each slide:

```markdown
---
---

# Slide 1 Title

Content

---
---

# Slide 2 Title

Content
```

**Critical:** Each `---` must be on its own line. For pages without configuration, use double `---` with nothing between them.

### 2. Frontmatter (Page Configuration)

Place configuration BETWEEN two `---` markers:

```markdown
---
layout: two-cols
class: text-center
---

# Slide Content
```

### 3. Content vs. Configuration

- **Above first `---`**: Previous page content
- **Between `---` pairs**: Current page configuration
- **Below second `---`**: Current page content

### 4. Header to Slide Mapping

- `#` becomes slide title (main heading)
- `##` becomes section heading
- Consider each major section as a potential new slide

### 5. Code Blocks

Preserve code blocks with proper syntax highlighting:

```markdown
```js
function hello() {
  console.log("Hello World")
}
```
```

### 6. Lists

Convert nested lists into appropriate slide layouts. Consider using `v-clicks` for step-by-step reveal:

```markdown
<v-clicks>

- Item 1 (click to reveal)
- Item 2 (click to reveal)
- Item 3 (click to reveal)

</v-clicks>
```

## Layout Guidelines

### Choose Layout Based on Content:

| Content Type | Recommended Layout |
|--------------|-------------------|
| Title/Cover | `layout: center` + `class: text-center` |
| Text + Code | `layout: two-cols` (left: text, right: code) |
| Text + Image | `layout: image-right` or `layout: image-left` |
| Bullet points | Default (no layout needed) |
| Comparison | `layout: two-cols` with `::right::` |

### Common Layouts

**Two Columns (Text + Code):**
```markdown
---
layout: two-cols
---

# Left Column

- Point 1
- Point 2

::right::

```js
// Right column code
console.log("code")
```
```

**Center Content:**
```markdown
---
layout: center
class: text-center
---

# Centered Title

Description text
```

**Image + Text:**
```markdown
---
layout: image-right
image: https://example.com/image.jpg
---

# Title

Text on the left, image on the right
```

## Conversion Workflow

1. **Analyze source structure**: Identify main sections, headers, and content blocks
2. **Determine slide breaks**: Each major section or `#` header typically becomes a new slide
3. **Apply layouts**: Choose appropriate layouts based on content type
4. **Add frontmatter**: Insert configuration for slides needing special layouts
5. **Enhance with Slidev features**: Add `v-click` for animations, use proper syntax
6. **Validate**: Ensure all `---` pairs are correct and frontmatter is properly formatted

## Slidev Syntax Quick Reference

### Basic Elements

| Element | Syntax |
|---------|--------|
| Bold | `**text**` |
| Italic | `*text*` |
| Strikethrough | `~~text~~` |
| Inline code | `` `code` `` |
| Links | `[text](url)` |
| Images | `![alt](url)` or `<img src="url" class="..." />` |
| Tables | Standard Markdown table syntax |

### Click Animations

```markdown
<div v-click>
Appears on first click
</div>

<div v-click>
Appears on second click
</div>
```

### CSS Classes (for styling)

```markdown
<div class="text-center text-xl mt-10">
  Centered large text with top margin
</div>
```

Common classes:
- `text-center`, `text-left`, `text-right` - Alignment
- `text-xl`, `text-2xl`, `text-3xl` - Text size
- `mt-10`, `mb-5` - Margin top/bottom
- `w-60`, `h-40` - Width/height
- `rounded`, `shadow` - Rounded corners and shadow

### Images

```markdown
<!-- Basic -->
![alt](/image.png)

<!-- With positioning -->
<img src="/image.png" class="absolute top-10 right-10 w-40" />

<!-- Multiple images grid -->
<div grid="~ cols-2 gap-4">
  <img src="img1.jpg" />
  <img src="img2.jpg" />
</div>
```

## Best Practices

1. **Keep slides focused**: One main idea per slide
2. **Use layouts wisely**: Don't force complex layouts when simple will do
3. **Preserve code integrity**: Keep code blocks intact with proper language tags
4. **Add animations sparingly**: Use `v-click` for emphasis, not for everything
5. **Test structure**: Ensure all `---` pairs are properly closed

## Global Frontmatter (First Slide)

The first slide may include global configuration:

```markdown
---
theme: seriph
title: Presentation Title
class: text-center
---

# Title
```

Common themes: `default`, `seriph`, `apple-basic`, `shibainu`

## Resources

- Slidev syntax guide: https://sli.dev/guide/syntax.html
- Layout reference: https://sli.dev/guide/layouts.html
- Theme gallery: https://sli.dev/resources/theme-gallery
